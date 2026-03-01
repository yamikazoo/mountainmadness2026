import { Router } from "express";
import { supabaseAdmin } from "../services/supabase.ts";

const router = Router();

router.get("/test-supabase", async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("healthcheck")
      .select("*")
      .limit(5);

    if (error) {
      return res.status(500).json({
        ok: false,
        message: "Supabase query failed",
        error: error.message,
      });
    }

    return res.json({
      ok: true,
      message: "Supabase connected successfully",
      data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return res.status(500).json({
      ok: false,
      message: "Server error while testing Supabase",
      error: message,
    });
  }
});

export default router;