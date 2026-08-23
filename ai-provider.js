const { fal } = require("@fal-ai/client");

const MODELS = {
  "model-1": { id: "model-1", name: "Wyte Vision Fast", provider: "fal", endpoint: "fal-ai/flux-2/flash", tier: "pro" },
  "model-2": { id: "model-2", name: "Wyte Vision Max", provider: "fal", endpoint: "fal-ai/flux-2-max", tier: "pro" },
  "model-3": { id: "model-3", name: "Wyte Vision Creative", provider: "fal", endpoint: "fal-ai/flux-2", tier: "pro" },
  "model-4": { id: "model-4", name: "Wyte Vision Dev", provider: "fal", endpoint: "fal-ai/flux/dev", tier: "pro" },
  "model-5": { id: "model-5", name: "Wyte Vision Subject", provider: "fal", endpoint: "fal-ai/flux-subject", tier: "pro" },
};

function chooseModel(prompt, requested = "auto") {
  if (requested !== "auto" && MODELS[requested]) return MODELS[requested];
  const p = prompt.toLowerCase();
  if (/(product|brand|logo|packaging|campaign|advert)/.test(p)) return MODELS["model-2"];
  if (/(person|portrait|character|same person|subject)/.test(p)) return MODELS["model-5"];
  if (/(fast|quick|draft|idea)/.test(p)) return MODELS["model-1"];
  return MODELS["model-3"];
}

async function generateImage({ prompt, model = "auto", mode = "standard", aspectRatio = "1:1", imageUrl }) {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY_NOT_CONFIGURED");
  fal.config({ credentials: process.env.FAL_KEY });

  let selected = chooseModel(prompt, model);
  if (mode === "advanced-edit" && imageUrl) selected = { id: selected.id, name: selected.name + " Edit", provider: "fal", endpoint: "fal-ai/flux-2/edit", tier: "pro" };
  const input = { prompt };
  if (selected.endpoint !== "fal-ai/flux-subject" && !selected.endpoint.endsWith("/edit")) {
    input.num_images = 1;
    input.output_format = "png";
  }

  // Common image-size mapping supported by the FLUX endpoints.
  input.image_size = ({
    "1:1": "square_hd",
    "4:5": "portrait_4_3",
    "16:9": "landscape_16_9",
    "4:3": "landscape_4_3",
  })[aspectRatio] || "square_hd";

  if (imageUrl && selected.endpoint === "fal-ai/flux-subject") input.image_url = imageUrl;
  if (imageUrl && selected.endpoint.endsWith("/edit")) input.image_urls = [imageUrl];

  const result = await fal.subscribe(selected.endpoint, {
    input,
    logs: false,
  });

  const url = result?.data?.images?.[0]?.url;
  if (!url) throw new Error("AI_PROVIDER_NO_IMAGE");

  return {
    model: selected.id,
    modelName: selected.name,
    provider: selected.provider,
    endpoint: selected.endpoint,
    sourceUrl: url,
    requestId: result.requestId || null,
  };
}

module.exports = { MODELS, chooseModel, generateImage };
