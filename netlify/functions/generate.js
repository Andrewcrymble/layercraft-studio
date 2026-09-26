
exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "API key not configured" })
    };
  }

  try {
    const { description, layers, frame } =
      JSON.parse(event.body || "{}");

    if (!description || typeof description !== "string" ||
        description.length > 2000) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid description" })
      };
    }

    const layerCount = Math.max(
      2, Math.min(10, Number(layers) || 6)
    );

    const allowedFrames = [
      "Arch", "Circle", "Heart", "Rectangle"
    ];

    const frameShape = allowedFrames.includes(frame)
      ? frame : "Arch";

    const prompt = `
Create an elegant laser-cut wooden shadow-box
artwork concept.

Subject: ${description}
Frame shape: ${frameShape}
Number of intended physical layers: ${layerCount}

Use a traditional layered plywood art style.
Show distinct foreground, middle-ground and
background elements.

Use bold silhouettes, clear negative spaces
and visually separable depth planes.

Avoid extremely thin features, intricate
floating details and unnecessary textures.

Present the artwork as a beautiful,
front-facing composition suitable for
planning a multilayer laser-cut design.

Do not include text or labels.
`;

    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Authorization":
            "Bearer " + process.env.OPENAI_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt,
          size: "1024x1024",
          n: 1
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Image generation failed", response.status);
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "Image generation failed"
        })
      };
    }

    const image = result.data?.[0]?.b64_json;

    if (!image) {
      throw new Error("No image returned");
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image: "data:image/png;base64," + image
      })
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Unable to generate artwork"
      })
    };
  }
};
