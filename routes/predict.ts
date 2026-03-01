import { Router } from "express";
import { supabaseAdmin } from "../services/supabase";
import { predictSingleEventCost } from "../services/geminiBackend";

const router = Router();

router.post("/events/:id/predict", async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    if (!eventId || Number.isNaN(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const { data: event, error: fetchError } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (fetchError || !event) {
      return res.status(404).json({
        error: "Event not found",
        details: fetchError?.message,
      });
    }

    const prediction = await predictSingleEventCost({
      title: event.title,
      description: event.description,
      location: event.location,
      start_time: event.start_time,
      end_time: event.end_time,
    });

    const { data: updatedEvent, error: updateError } = await supabaseAdmin
      .from("events")
      .update({
        estimated_cost: prediction.estimated_cost,
        category: prediction.category,
        prediction_reasoning: prediction.prediction_reasoning,
        prediction_confidence: prediction.prediction_confidence,
      })
      .eq("id", eventId)
      .select("*")
      .single();

    if (updateError) {
      return res.status(500).json({
        error: "Prediction succeeded but update failed",
        details: updateError.message,
      });
    }

    return res.json({
      ok: true,
      message: "Event predicted successfully",
      prediction,
      event: updatedEvent,
    });
  } catch (error) {
    console.error("POST /events/:id/predict error:", error);
    return res.status(500).json({
      error: "Failed to predict event cost",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/events/predict-all", async (_req, res) => {
    try {
      const { data: events, error: fetchError } = await supabaseAdmin
        .from("events")
        .select("*")
        .eq("source", "calendar")
        .or("category.eq.Uncategorized,estimated_cost.eq.0");
  
      if (fetchError) {
        return res.status(500).json({
          error: "Failed to fetch events for batch prediction",
          details: fetchError.message,
        });
      }
  
      if (!events || events.length === 0) {
        return res.json({
          ok: true,
          message: "No events need prediction",
          updated_count: 0,
          events: [],
        });
      }
  
      const results = [];
  
      for (const event of events) {
        const prediction = await predictSingleEventCost({
          title: event.title,
          description: event.description,
          location: event.location,
          start_time: event.start_time,
          end_time: event.end_time,
        });
  
        const { data: updatedEvent, error: updateError } = await supabaseAdmin
          .from("events")
          .update({
            estimated_cost: prediction.estimated_cost,
            category: prediction.category,
            prediction_reasoning: prediction.prediction_reasoning,
            prediction_confidence: prediction.prediction_confidence,
          })
          .eq("id", event.id)
          .select("*")
          .single();
  
        if (updateError) {
          results.push({
            id: event.id,
            title: event.title,
            ok: false,
            error: updateError.message,
          });
        } else {
          results.push({
            id: event.id,
            title: event.title,
            ok: true,
            prediction,
            event: updatedEvent,
          });
        }
      }
  
      return res.json({
        ok: true,
        message: "Batch prediction completed",
        updated_count: results.filter((r) => r.ok).length,
        failed_count: results.filter((r) => !r.ok).length,
        results,
      });
    } catch (error) {
      console.error("POST /events/predict-all error:", error);
      return res.status(500).json({
        error: "Failed to batch predict events",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

export default router;