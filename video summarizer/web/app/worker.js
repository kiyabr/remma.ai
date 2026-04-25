import { pipeline, env } from "@xenova/transformers";

// Skip local checks for models since we're in a browser environment
env.allowLocalModels = false;

class SummarizerPipeline {
  static task = 'text2text-generation';
  static model = 'Xenova/LaMini-Flan-T5-77M'; // Instruction-following model
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { 
        progress_callback,
        quantized: true 
      });
    }
    return this.instance;
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { text } = event.data;

  const summarizer = await SummarizerPipeline.getInstance(x => {
    self.postMessage(x);
  });

  // Instruction-oriented prompt for the local model
  const prompt = `Task: Summarize the following YouTube transcript. 
  Structure your response exactly with these three sections using the emojis:
  📌 **Overview**: [A brief paragraph about the video]
  🔑 **Key Points**: 
  - [Point 1]
  - [Point 2]
  💡 **Main Takeaways**: 
  - [Takeaway 1]
  
  Transcript: ${text}`;

  const output = await summarizer(prompt, {
    max_new_tokens: 450,
    repetition_penalty: 1.2,
    temperature: 0.5,
  });

  self.postMessage({
    status: 'complete',
    output: output[0].generated_text
  });
});
