import { prisma } from "./prisma";

export const DEFAULT_CATEGORIES: { name: string; color: string; icon: string; kind: "INCOME" | "EXPENSE" }[] = [
  { name: "Salary", color: "#34d399", icon: "Briefcase", kind: "INCOME" },
  { name: "Food", color: "#fbbf24", icon: "UtensilsCrossed", kind: "EXPENSE" },
  { name: "Rent", color: "#f472b6", icon: "Home", kind: "EXPENSE" },
  { name: "Transport", color: "#60a5fa", icon: "Car", kind: "EXPENSE" },
  { name: "Utilities", color: "#a78bfa", icon: "Zap", kind: "EXPENSE" },
  { name: "Entertainment", color: "#f87171", icon: "Film", kind: "EXPENSE" },
  { name: "Health", color: "#4ade80", icon: "HeartPulse", kind: "EXPENSE" },
  { name: "Shopping", color: "#fb923c", icon: "ShoppingBag", kind: "EXPENSE" },
  { name: "Travel", color: "#22d3ee", icon: "Plane", kind: "EXPENSE" },
  { name: "Subscriptions", color: "#c084fc", icon: "Repeat", kind: "EXPENSE" },
  { name: "Investments", color: "#10b981", icon: "TrendingUp", kind: "INCOME" },
  { name: "Interest", color: "#ef4444", icon: "TrendingUp", kind: "EXPENSE" },
  { name: "Other", color: "#9ca3af", icon: "Tag", kind: "EXPENSE" },
];

export async function seedDefaultCategories(userId: string) {
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ userId, ...c })),
  });
}

export const ICON_CHOICES = [
  "Briefcase", "Home", "Car", "Zap", "Film", "HeartPulse", "ShoppingBag", "Plane",
  "Repeat", "TrendingUp", "Tag", "UtensilsCrossed", "Coffee", "Gift", "Book", "Music",
  "Dumbbell", "Baby", "PawPrint", "Wifi", "Phone", "Fuel", "Bus", "Train",
  "GraduationCap", "Stethoscope", "Pill", "Wrench", "Shirt", "DollarSign",
];

export const COLOR_CHOICES = [
  "#34d399", "#fbbf24", "#f472b6", "#60a5fa", "#a78bfa", "#f87171",
  "#4ade80", "#fb923c", "#22d3ee", "#c084fc", "#10b981", "#9ca3af",
  "#ec4899", "#8b5cf6", "#0ea5e9", "#ef4444",
];
