import type { DFA } from "./dfa-parser"

export const defaultDFA: DFA = {
  alphabet: ["b", "h", "n", "o", "c", "x", "d", "k", "s", "l", "r", "f", "v", "t", "y", "m"],
  states: ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "s12", "s13", "s14"],
  initialState: "s0",
  acceptingStates: ["s14"],
  transitions: [
    { from: "s0", symbol: "b", to: "s1" },
    { from: "s0", symbol: "f", to: "s12" },
    { from: "s1", symbol: "h", to: "s2" },
    { from: "s1", symbol: "f", to: "s12" },
    { from: "s2", symbol: "n", to: "s3" },
    { from: "s2", symbol: "t", to: "s9" },
    { from: "s2", symbol: "l", to: "s10" },
    { from: "s2", symbol: "m", to: "s14" },
    { from: "s2", symbol: "f", to: "s12" },
    { from: "s3", symbol: "o", to: "s4" },
    { from: "s3", symbol: "x", to: "s5" },
    { from: "s3", symbol: "f", to: "s12" },
    { from: "s4", symbol: "c", to: "s3" },
    { from: "s4", symbol: "f", to: "s12" },
    { from: "s5", symbol: "d", to: "s6" },
    { from: "s5", symbol: "f", to: "s12" },
    { from: "s6", symbol: "k", to: "s7" },
    { from: "s6", symbol: "f", to: "s12" },
    { from: "s7", symbol: "s", to: "s8" },
    { from: "s7", symbol: "f", to: "s12" },
    { from: "s8", symbol: "t", to: "s9" },
    { from: "s8", symbol: "f", to: "s12" },
    { from: "s9", symbol: "y", to: "s2" },
    { from: "s9", symbol: "f", to: "s12" },
    { from: "s10", symbol: "r", to: "s11" },
    { from: "s10", symbol: "f", to: "s12" },
    { from: "s11", symbol: "h", to: "s2" },
    { from: "s11", symbol: "f", to: "s12" },
    { from: "s12", symbol: "v", to: "s13" },
    { from: "s13", symbol: "h", to: "s2" },
    { from: "s13", symbol: "f", to: "s12" },
    { from: "s14", symbol: "f", to: "s12" },
  ],
}
