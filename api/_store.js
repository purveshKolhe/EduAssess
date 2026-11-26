// Sample data store for EduAssess (seeded from PRD sample data)
function createInitialData() {
  return {
    exams: [
      {
        examId: "exam-1",
        code: "BIO-CELL-01",
        title: "Biology 101 · Cell Biology Quiz",
        className: "Class 10-B · 30 students",
        date: "23 Oct 2026",
        opensAt: "09:00",
        lastEntryAt: "09:30",
        durationMins: 30,
        status: "LIVE",
        trackTabSwitch: true,
        inProgressCount: 18,
        submittedCount: 10,
        notStartedCount: 2,
        questions: [
          { id: 1, title: "Cell energy", text: "Which organelle produces most of the cell's ATP during aerobic respiration?", points: 2 },
          { id: 2, title: "Mitosis", text: "List the four main stages of mitosis in order and briefly describe metaphase.", points: 2 },
          { id: 3, title: "Cell membrane", text: "Describe the fluid mosaic model of the plasma membrane.", points: 2 },
          { id: 4, title: "Ribosomes", text: "What is the primary role of ribosomes in both prokaryotic and eukaryotic cells?", points: 1 },
          { id: 5, title: "Chloroplasts", text: "Explain why plant cells contain both mitochondria and chloroplasts.", points: 2 },
          { id: 6, title: "Prokaryotes", text: "State two structural differences between prokaryotic and eukaryotic cells.", points: 2 },
          { id: 7, title: "Endoplasmic reticulum", text: "Compare the functions of rough ER and smooth ER.", points: 2 },
          { id: 8, title: "Active transport", text: "How does active transport differ from facilitated diffusion across a membrane?", points: 2 },
          { id: 9, title: "Lysosomes", text: "Why are lysosomes often described as the recycling centers of the cell?", points: 1 },
          { id: 10, title: "Nucleus", text: "Explain the function of nuclear pores in the nuclear envelope.", points: 1 },
          { id: 11, title: "Cell wall", text: "What molecule gives rigidity to plant cell walls?", points: 1 },
          { id: 12, title: "Osmosis", text: "Explain how water moves across a selectively permeable membrane during osmosis.", points: 2 }
        ]
      },
      {
        examId: "exam-2",
        code: "BIO-GEN-02",
        title: "Biology 101 · Genetics Check",
        className: "Class 10-B · 30 students",
        date: "28 Oct 2026",
        opensAt: "10:00",
        lastEntryAt: "10:20",
        durationMins: 25,
        status: "DRAFT",
        trackTabSwitch: true,
        inProgressCount: 0,
        submittedCount: 0,
        notStartedCount: 30,
        questions: [
          { id: 1, title: "DNA structure", text: "Name the four nitrogenous bases found in DNA.", points: 2 },
          { id: 2, title: "Alleles", text: "Distinguish between dominant and recessive alleles.", points: 2 },
          { id: 3, title: "Punnett square", text: "Predict the phenotypic ratio of a monohybrid cross between two heterozygotes.", points: 2 },
          { id: 4, title: "Transcription", text: "Where does transcription occur in a eukaryotic cell?", points: 1 },
          { id: 5, title: "Mutation", text: "Explain what a point mutation is.", points: 2 },
          { id: 6, title: "Chromosomes", text: "How many chromosomes are present in a normal human somatic cell?", points: 1 }
        ]
      },
      {
        examId: "exam-3",
        code: "BIO-LAB-00",
        title: "Biology 101 · Lab Safety",
        className: "Class 10-B · 30 students",
        date: "20 Oct 2026",
        opensAt: "09:00",
        lastEntryAt: "09:15",
        durationMins: 20,
        status: "CLOSED",
        trackTabSwitch: true,
        inProgressCount: 0,
        submittedCount: 30,
        notStartedCount: 0,
        questions: [
          { id: 1, title: "Eye protection", text: "When must safety goggles be worn in the biology laboratory?", points: 2 }
        ]
      }
    ],
    attempts: {
      "ATT-1042-01": {
        attemptId: "ATT-1042-01",
        examCode: "BIO-CELL-01",
        examTitle: "Biology 101 · Cell Biology Quiz",
        studentId: "ST-1042",
        studentName: "Maya Patel",
        className: "Class 10-B",
        startedAt: "09:30:00",
        endsAt: "10:00:00 IST",
        submittedAt: null,
        submitMethod: null,
        receiptId: "EA-20261023-1042",
        status: "IN_PROGRESS",
        remainingSeconds: 42,
        lastSavedAt: "09:59:18",
        flaggedQuestions: [5],
        timings: { 1: 80, 2: 190, 3: 125, 12: 42 },
        answers: {
          1: "Mitochondria generate most of the cell's ATP through cellular respiration.",
          2: "Prophase, metaphase, anaphase, telophase. During metaphase, chromosomes line up at the cell equator.",
          3: "The membrane is a phospholipid bilayer with embedded proteins that move laterally.",
          4: "Ribosomes synthesize proteins from amino acids using mRNA instructions.",
          5: "Chloroplasts convert sunlight into glucose, while mitochondria break down glucose into ATP.",
          6: "Prokaryotes lack a membrane-bound nucleus and membrane-bound organelles.",
          7: "Rough ER has ribosomes and modifies proteins; smooth ER synthesizes lipids.",
          8: "",
          9: "Lysosomes contain digestive enzymes that break down worn-out cell parts.",
          10: "Nuclear pores regulate transport of RNA and proteins between nucleus and cytoplasm.",
          11: "Cellulose fibers give plant cell walls structural rigidity.",
          12: "Water moves from a dilute solution to a more concentrated solution through a selectively permeable membrane."
        }
      }
    },
    auditLogs: {
      "ATT-1042-01": {
        reviewed: false,
        events: [
          { time: "09:30:00", type: "START", text: "09:30:00 · Attempt started" },
          { time: "09:47:30", type: "TAB_LEFT", text: "09:47:30 · Tab left · review event", isFlag: true },
          { time: "09:47:42", type: "TAB_RETURN", text: "09:47:42 · Returned after 12 seconds" },
          { time: "09:47:42", type: "WARNING_ACK", text: "09:47:42 · Student warning acknowledged" },
          { time: "09:58:36", type: "DRAFT_SAVE", text: "09:58:36 · Q12 draft saved" },
          { time: "09:59:18", type: "SYNC", text: "09:59:18 · Latest answers synced" }
        ]
      }
    }
  };
}

let store = createInitialData();

function getStore() {
  return store;
}

function resetStore() {
  store = createInitialData();
  return store;
}

module.exports = { getStore, resetStore };
