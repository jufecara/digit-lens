export type SpikeResult = {
  status: "not-implemented";
  notes: string[];
};

export async function runSpike(): Promise<SpikeResult> {
  return {
    status: "not-implemented",
    notes: ["Library API is not implemented yet. Active work currently lives in the in-house spike scripts under /scripts and /spikes."]
  };
}
