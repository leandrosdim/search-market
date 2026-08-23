import { getPool } from "@/lib/db";

export type ResearchInstruction = {
  id: number;
  category: string;
  instruction: string;
  rationale: string;
  source: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listInstructions(includeInactive = false): Promise<ResearchInstruction[]> {
  const pool = getPool();
  const sql = includeInactive
    ? "SELECT id, category, instruction, rationale, source, priority, is_active, created_at, updated_at FROM research_instructions ORDER BY is_active DESC, priority DESC, category ASC, id ASC"
    : "SELECT id, category, instruction, rationale, source, priority, is_active, created_at, updated_at FROM research_instructions WHERE is_active = true ORDER BY priority DESC, category ASC, id ASC";
  const result = await pool.query(sql);
  return result.rows.map((row) => ({
    id: Number(row.id),
    category: row.category,
    instruction: row.instruction,
    rationale: row.rationale ?? "",
    source: row.source ?? "",
    priority: Number(row.priority),
    isActive: row.is_active,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  }));
}

export async function getInstruction(id: number): Promise<ResearchInstruction | null> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT id, category, instruction, rationale, source, priority, is_active, created_at, updated_at FROM research_instructions WHERE id = $1",
    [id],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    category: row.category,
    instruction: row.instruction,
    rationale: row.rationale ?? "",
    source: row.source ?? "",
    priority: Number(row.priority),
    isActive: row.is_active,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function createInstruction(data: {
  category: string;
  instruction: string;
  rationale?: string;
  source?: string;
  priority: number;
  isActive?: boolean;
}): Promise<ResearchInstruction> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO research_instructions (category, instruction, rationale, source, priority, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now(), now())
       RETURNING id, category, instruction, rationale, source, priority, is_active, created_at, updated_at`,
      [
        data.category.trim(),
        data.instruction.trim(),
        (data.rationale ?? "").trim(),
        (data.source ?? "user_prompt").trim(),
        data.priority,
        data.isActive ?? true,
      ],
    );
    await client.query("COMMIT");
    const row = result.rows[0];
    return {
      id: Number(row.id),
      category: row.category,
      instruction: row.instruction,
      rationale: row.rationale ?? "",
      source: row.source ?? "",
      priority: Number(row.priority),
      isActive: row.is_active,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateInstruction(
  id: number,
  data: {
    category?: string;
    instruction?: string;
    rationale?: string;
    source?: string;
    priority?: number;
    isActive?: boolean;
  },
): Promise<ResearchInstruction | null> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT id FROM research_instructions WHERE id = $1",
      [id],
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (data.category !== undefined) {
      sets.push(`category = $${paramIdx++}`);
      values.push(data.category.trim());
    }
    if (data.instruction !== undefined) {
      sets.push(`instruction = $${paramIdx++}`);
      values.push(data.instruction.trim());
    }
    if (data.rationale !== undefined) {
      sets.push(`rationale = $${paramIdx++}`);
      values.push(data.rationale.trim());
    }
    if (data.source !== undefined) {
      sets.push(`source = $${paramIdx++}`);
      values.push(data.source.trim());
    }
    if (data.priority !== undefined) {
      sets.push(`priority = $${paramIdx++}`);
      values.push(data.priority);
    }
    if (data.isActive !== undefined) {
      sets.push(`is_active = $${paramIdx++}`);
      values.push(data.isActive);
    }

    if (sets.length === 0) {
      await client.query("ROLLBACK");
      return getInstruction(id);
    }

    sets.push(`updated_at = now()`);
    values.push(id);

    const result = await client.query(
      `UPDATE research_instructions SET ${sets.join(", ")} WHERE id = $${paramIdx} RETURNING id, category, instruction, rationale, source, priority, is_active, created_at, updated_at`,
      values,
    );
    await client.query("COMMIT");
    const row = result.rows[0];
    return {
      id: Number(row.id),
      category: row.category,
      instruction: row.instruction,
      rationale: row.rationale ?? "",
      source: row.source ?? "",
      priority: Number(row.priority),
      isActive: row.is_active,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deactivateInstruction(id: number): Promise<boolean> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "UPDATE research_instructions SET is_active = false, updated_at = now() WHERE id = $1",
      [id],
    );
    await client.query("COMMIT");
    return result.rowCount !== null && result.rowCount > 0;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function reactivateInstruction(id: number): Promise<boolean> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "UPDATE research_instructions SET is_active = true, updated_at = now() WHERE id = $1",
      [id],
    );
    await client.query("COMMIT");
    return result.rowCount !== null && result.rowCount > 0;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}