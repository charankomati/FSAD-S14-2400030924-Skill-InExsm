import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Seed database with default data
async function seedDatabase() {
  try {
    // Create default cohorts
    const cohortCount = await prisma.cohort.count();
    if (cohortCount === 0) {
      await prisma.cohort.createMany({
        data: [
          { name: "Group A (4-8y)", deficiency_risk: 12, metabolic_efficiency: 88 },
          { name: "Group B (9-13y)", deficiency_risk: 24, metabolic_efficiency: 76 },
          { name: "Group C (14-18y)", deficiency_risk: 18, metabolic_efficiency: 82 },
        ],
      });
    }

    // Create default RDA standards
    const rdaCount = await prisma.rDAStandard.count();
    if (rdaCount === 0) {
      await prisma.rDAStandard.createMany({
        skipDuplicates: true,
        data: [
          { age_group: "pediatric", nutrient: "Vitamin A", value: 400, rda: 500, unit: "mcg" },
          { age_group: "pediatric", nutrient: "Iron", value: 7, rda: 10, unit: "mg" },
          { age_group: "pediatric", nutrient: "Zinc", value: 3, rda: 5, unit: "mg" },
          { age_group: "pediatric", nutrient: "Calcium", value: 700, rda: 1000, unit: "mg" },
          { age_group: "adolescent", nutrient: "Vitamin A", value: 700, rda: 900, unit: "mcg" },
          { age_group: "adolescent", nutrient: "Iron", value: 11, rda: 15, unit: "mg" },
          { age_group: "adolescent", nutrient: "Zinc", value: 8, rda: 11, unit: "mg" },
          { age_group: "adolescent", nutrient: "Calcium", value: 1100, rda: 1300, unit: "mg" },
        ],
      });
    }
  } catch (error) {
    console.error("Seed error:", error);
  }
}


async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

  // Initialize database
  await seedDatabase();

  // Default user ID (for demo purposes)
  const DEFAULT_USER_ID = 1;

  // Ensure default user exists
  app.use(async (req, res, next) => {
    try {
      const user = await prisma.user.findFirst();
      if (!user) {
        await prisma.user.create({
          data: {
            name: "charan",
            email: "charan@auranutrics.com",
            age: 18,
            height: 168,
            weight: 66,
            gender: "Male",
            activity_level: "Moderate",
            diet_type: "Balanced",
            allergies: "None",
            goal: "Maintain optimal health and nutrition",
          },
        });
      }
    } catch (error) {
      console.error("User initialization error:", error);
    }
    next();
  });

  // API Routes using Prisma
  app.get("/api/user/profile", async (req, res) => {
    try {
      const user = await prisma.user.findFirst();
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/user/profile", async (req, res) => {
    try {
      const { name, age, weight, height, gender, activity_level, goal, diet_type, allergies } = req.body;
      const user = await prisma.user.findFirst();
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { name, age, weight, height, gender, activity_level, goal, diet_type, allergies },
      });
      res.json({ status: "ok", user: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/rda", async (req, res) => {
    try {
      const ageGroup = req.query.ageGroup || "pediatric";
      const rda = await prisma.rDAStandard.findMany({
        where: { age_group: String(ageGroup) },
      });
      
      const formattedRda = rda.reduce((acc: any, curr: any) => {
        acc[curr.nutrient.toLowerCase().replace(" ", "")] = { 
          value: curr.value, 
          rda: curr.rda, 
          unit: curr.unit 
        };
        return acc;
      }, {});
      
      res.json({ [ageGroup]: formattedRda });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RDA standards" });
    }
  });

  app.get("/api/cohorts", async (req, res) => {
    try {
      const cohorts = await prisma.cohort.findMany();
      res.json(cohorts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cohorts" });
    }
  });

  app.get("/api/meals", async (req, res) => {
    try {
      const query = req.query.search ? String(req.query.search).toLowerCase() : '';
      const user = await prisma.user.findFirst();
      
      if (!user) {
        return res.json([]);
      }

      const meals = await prisma.meal.findMany({
        where: {
          userId: user.id,
          food_name: { contains: query, mode: "insensitive" },
        },
        orderBy: { created_at: "desc" },
        take: 20,
      });

      res.json(meals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meals" });
    }
  });

  app.post("/api/meals", async (req, res) => {
    try {
      const { foodName, calories, macronutrients, healthInsights, predictiveRisk } = req.body;
      const user = await prisma.user.findFirst();

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const newMeal = await prisma.meal.create({
        data: {
          userId: user.id,
          food_name: foodName,
          calories,
          protein: macronutrients.protein,
          carbs: macronutrients.carbs,
          fat: macronutrients.fat,
          fiber: macronutrients.fiber || 0,
          insights: healthInsights,
          risk: predictiveRisk,
        },
      });

      // Create notification if high risk
      if (predictiveRisk.toLowerCase().includes("high") || predictiveRisk.toLowerCase().includes("deficiency")) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: "Nutritional Risk",
            message: `High risk detected in recent ingestion: ${foodName}`,
            type: "warning",
          },
        });
      }

      res.json({ id: newMeal.id });
    } catch (error) {
      res.status(500).json({ error: "Failed to create meal" });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    try {
      const user = await prisma.user.findFirst();
      
      if (!user) {
        return res.json([]);
      }

      const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { created_at: "desc" },
        take: 10,
      });

      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/read", async (req, res) => {
    try {
      const user = await prisma.user.findFirst();
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await prisma.notification.updateMany({
        where: { userId: user.id },
        data: { is_read: true },
      });

      res.json({ status: "ok" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update notifications" });
    }
  });

  app.get("/api/settings", async (req, res) => {
    try {
      const user = await prisma.user.findFirst();
      
      if (!user) {
        return res.json({ age_group: "pediatric" });
      }

      let settings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
      });

      if (!settings) {
        settings = await prisma.userSettings.create({
          data: { userId: user.id },
        });
      }

      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { key, value } = req.body;
      const user = await prisma.user.findFirst();
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let settings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
      });

      if (!settings) {
        settings = await prisma.userSettings.create({
          data: { userId: user.id },
        });
      }

      const updateData: any = {};
      updateData[key] = value;

      const updated = await prisma.userSettings.update({
        where: { id: settings.id },
        data: updateData,
      });

      res.json({ status: "ok", data: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Mock authentication for demo
      if (email && password === "aura2026") {
        const user = await prisma.user.findFirst();
        res.json({ success: true, user: { name: user?.name || "Charan", email } });
      } else {
        res.status(401).json({ success: false, message: "Invalid credentials. Hint: use 'aura2026' as password." });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: "Login failed" });
    }
  });

  app.get("/api/biometrics", (req, res) => {
    res.json({
      heartRate: 72 + Math.floor(Math.random() * 10 - 5),
      metabolicRate: 1450 + Math.floor(Math.random() * 100 - 50),
      activityLevel: "Moderate",
      sleepQuality: 0.85,
      timestamp: new Date().toISOString()
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AuraNutrics Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
