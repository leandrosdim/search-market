"use server";

import { revalidatePath } from "next/cache";
import {
  createInstruction,
  updateInstruction,
  deactivateInstruction,
  reactivateInstruction,
} from "@/lib/research-instructions";

function trimMax(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function parsePriority(raw: FormDataEntryValue | null): number {
  if (raw == null) return 3;
  const n = Number(raw);
  if (!Number.isInteger(n)) return 3;
  return Math.max(1, Math.min(5, n));
}

function parseBoolean(formData: FormData, name: string): boolean {
  return formData.getAll(name).some((raw) => raw === "true" || raw === "on" || raw === "1");
}

export async function createInstructionAction(formData: FormData): Promise<void> {
  const category = formData.get("category");
  const instruction = formData.get("instruction");

  if (!category || typeof category !== "string" || category.trim().length === 0) {
    return;
  }
  if (!instruction || typeof instruction !== "string" || instruction.trim().length === 0) {
    return;
  }

  const priority = parsePriority(formData.get("priority"));
  const isActive = parseBoolean(formData, "is_active");

  try {
    await createInstruction({
      category: trimMax(category, 120),
      instruction: trimMax(instruction, 2000),
      rationale: trimMax((formData.get("rationale") as string) ?? "", 2000),
      source: trimMax((formData.get("source") as string) ?? "", 200),
      priority,
      isActive,
    });
    revalidatePath("/instructions");
    return;
  } catch {
    return;
  }
}

export async function updateInstructionAction(id: number, formData: FormData): Promise<void> {
  const category = formData.get("category");
  const instruction = formData.get("instruction");

  if (category !== null && (typeof category !== "string" || category.trim().length === 0)) {
    return;
  }
  if (instruction !== null && (typeof instruction !== "string" || instruction.trim().length === 0)) {
    return;
  }

  const priority = parsePriority(formData.get("priority"));
  const isActive = parseBoolean(formData, "is_active");

  try {
    const result = await updateInstruction(id, {
      category: category ? trimMax(category, 120) : undefined,
      instruction: instruction ? trimMax(instruction, 2000) : undefined,
      rationale: formData.get("rationale") !== null ? trimMax((formData.get("rationale") as string) ?? "", 2000) : undefined,
      source: formData.get("source") !== null ? trimMax((formData.get("source") as string) ?? "", 200) : undefined,
      priority: formData.get("priority") !== null ? priority : undefined,
      isActive,
    });
    if (!result) {
      return;
    }
    revalidatePath("/instructions");
    return;
  } catch {
    return;
  }
}

export async function deactivateInstructionAction(id: number): Promise<void> {
  try {
    const ok = await deactivateInstruction(id);
    if (!ok) return;
    revalidatePath("/instructions");
    return;
  } catch {
    return;
  }
}

export async function reactivateInstructionAction(id: number): Promise<void> {
  try {
    const ok = await reactivateInstruction(id);
    if (!ok) return;
    revalidatePath("/instructions");
    return;
  } catch {
    return;
  }
}