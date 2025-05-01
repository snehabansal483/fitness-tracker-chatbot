import { NextResponse } from "next/server";
import Replicate from "replicate";
import { MongoClient } from "mongodb";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const WEBHOOK_HOST = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NGROK_HOST;

const client = new MongoClient(process.env.MONGODB_URI);

async function connectToDatabase() {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
      console.log("Connected to MongoDB");
    }
    return client.db("db");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}
export async function GET(request) {
  try {
    console.log("Received request for fetching old chats");
    const db = await connectToDatabase();
    console.log("db connected");
    const result = await db.collection("fitness").find({}).toArray();
    if (result.length > 0) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json({}, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
const prompts = [
  "Hi there! How can I help you with your fitness goals today?",
  "Would you like to log a new workout or view your progress so far?",
  "What type of exercise did you do today? Please specify the activity and duration.",
  "Great job! Do you want to set a new fitness goal for this week?",
  "Would you like recommendations for workouts based on your fitness level and goals?",
  "How are you feeling after your recent workout? Any feedback or notes you'd like to add?",
  "Let's track your nutrition as well! What did you eat today?",
  "Would you like to see a summary of your weekly fitness progress?"
];

async function waitForPrediction(id) {
  let prediction;
  for (let i = 0; i < 20; i++) { // 20 retries max (20 * 1.5s = 30 sec)
    prediction = await replicate.predictions.get(id);
    console.log(`Poll ${i + 1}: Prediction status:`, prediction.status);
    if (prediction.status === "succeeded" || prediction.status === "failed" || prediction.status === "canceled") {
      break;
    }
    await new Promise((res) => setTimeout(res, 1500)); // wait 1.5 sec
  }
  return prediction;
}

export async function POST(request) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        {
          detail:
            "The REPLICATE_API_TOKEN environment variable is not set. See README.md for instructions on how to set it.",
        },
        { status: 500 }
      );
    }

    const { prompt, consent } = await request.json();
    console.log("Received request with prompt:", prompt, "and consent:", consent);

    const options = {
      version: "f1d50bb24186c52daae319ca8366e53debdaa9e0ae7ff976e918df752732ccc4",
      input: { prompt },
    };

    if (WEBHOOK_HOST) {
      options.webhook = `${WEBHOOK_HOST}/api/webhooks`;
      options.webhook_events_filter = ["start", "completed"];
    }

    const resp = await replicate.predictions.create(options);
    console.log("Created prediction id");

    if (resp?.error) {
      return NextResponse.json({ detail: resp.error }, { status: 500 });
    }

    const id = resp.id;
    console.log("Prediction ID:", id);

    if (!id) {
      return NextResponse.json(
        { detail: "Prediction ID is required." },
        { status: 400 }
      );
    }

    // 🔥 Poll until prediction finishes
    let prediction = await waitForPrediction(id);

    console.log("Final prediction object:", JSON.stringify(prediction, null, 2));

    if (prediction?.error) {
      return NextResponse.json({ detail: prediction.error }, { status: 500 });
    }

    if (prediction.status !== "succeeded") {
      return NextResponse.json(
        { detail: "Prediction did not complete successfully.", status: prediction.status },
        { status: 500 }
      );
    }

    const botResponse = Array.isArray(prediction.output)
      ? prediction.output.join("")
      : prediction.output || "No output";

    if (consent === true) {
      const db = await connectToDatabase();
      console.log("DB connected");

      const result = await db.collection("fitness").insertOne({
        id,
        prompt: prompt,
        response: botResponse,
        timestamp: new Date(),
      });
      console.log("Chat interaction saved to database:", result);
    }

    console.log("Bot response:", botResponse);

    return NextResponse.json(
      { ...prediction, safe_output: botResponse },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
