export function formatStepNumbersRange(nums) {
  if (!nums) return "Sin pasos";
  const clean = (Array.isArray(nums) ? nums : String(nums).split(/[,;\s]+/))
    .map(x => parseInt(x, 10))
    .filter(n => !isNaN(n) && n > 0);
  if (clean.length === 0) return "Sin pasos";
  const sorted = [...new Set(clean)].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `P${start}` : `P${start}–${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `P${start}` : `P${start}–${end}`);
  return ranges.join(", ");
}

export function parseStepNumbersInput(inputStr, maxLimit = 500) {
  if (!inputStr) return [];
  const parts = String(inputStr).split(/[,;\s]+/);
  const result = new Set();
  parts.forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const rangeMatch = trimmed.match(/^(\d+)(?:-|\.\.(\d+))$/);
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1], 10);
      const to = parseInt(rangeMatch[2], 10);
      const min = Math.min(from, to);
      const max = Math.min(Math.max(from, to), maxLimit);
      for (let i = min; i <= max; i++) {
        if (i >= 1) result.add(i);
      }
    } else if (/^\d+$/.test(trimmed)) {
      const n = parseInt(trimmed, 10);
      if (n >= 1 && n <= maxLimit) result.add(n);
    }
  });
  return Array.from(result).sort((a, b) => a - b);
}

export function isStepCleaning(step) {
  if (!step) return false;
  // Respetar estrictamente el valor almacenado en la base de datos
  if (step.is_cleaning === true || step.is_cleaning === 1 || step.is_cleaning === "1" || step.is_cleaning === "true") {
    return true;
  }
  if (step.is_cleaning === false || step.is_cleaning === 0 || step.is_cleaning === "0" || step.is_cleaning === "false") {
    return false;
  }
  // Por defecto es Ensamblaje si no se especifica
  return false;
}

export function distributeStepsSeparatingCleaning(stations, modelSteps, customCleaningSet = null) {
  if (!stations || stations.length === 0) return [];
  let effectiveSteps = modelSteps || [];
  if (effectiveSteps.length === 0) {
    effectiveSteps = Array.from({ length: 52 }, (_, i) => ({
      step_number: i + 1,
      operation: `Paso ${i + 1}`,
      is_cleaning: false
    }));
  }

  let cleaningNums = [];
  if (customCleaningSet && customCleaningSet instanceof Set) {
    cleaningNums = Array.from(customCleaningSet).sort((a, b) => a - b);
  } else if (Array.isArray(customCleaningSet)) {
    cleaningNums = [...new Set(customCleaningSet)].sort((a, b) => a - b);
  } else {
    cleaningNums = effectiveSteps.filter(s => isStepCleaning(s)).map(s => s.step_number);
  }
  const cleanSet = new Set(cleaningNums);

  const assemblyNums = effectiveSteps
    .map(s => s.step_number)
    .filter(n => !cleanSet.has(n))
    .sort((a, b) => a - b);

  let cleanIndices = [];
  let asmbIndices = [];
  stations.forEach((st, idx) => {
    const isClean = Boolean(
      st.is_cleaning_station ||
      st.station_type === "CLEANING" ||
      (st.station_name || "").toLowerCase().includes("limpieza")
    );
    if (isClean) {
      cleanIndices.push(idx);
    } else {
      asmbIndices.push(idx);
    }
  });

  if (cleanIndices.length < 2 && stations.length >= 2) {
    cleanIndices = [];
    asmbIndices = [];
    const midIdx = Math.floor(stations.length / 2);
    const lastIdx = stations.length - 1;
    stations.forEach((st, idx) => {
      if (idx === midIdx || idx === lastIdx) {
        cleanIndices.push(idx);
      } else {
        asmbIndices.push(idx);
      }
    });
  }

  const resultStepMap = {};
  if (asmbIndices.length > 0) {
    const baseCount = Math.floor(assemblyNums.length / asmbIndices.length);
    const remainder = assemblyNums.length % asmbIndices.length;
    let cur = 0;
    asmbIndices.forEach((stIdx, i) => {
      const extra = i < remainder ? 1 : 0;
      const count = baseCount + extra;
      resultStepMap[stIdx] = assemblyNums.slice(cur, cur + count);
      cur += count;
    });
  }

  if (cleanIndices.length === 2) {
    const midCutoff = Math.max(1, Math.floor(cleaningNums.length / 2));
    resultStepMap[cleanIndices[0]] = cleaningNums.slice(0, midCutoff);
    resultStepMap[cleanIndices[1]] = cleaningNums.slice(midCutoff);
  } else if (cleanIndices.length > 0) {
    const baseClean = Math.floor(cleaningNums.length / cleanIndices.length);
    const remClean = cleaningNums.length % cleanIndices.length;
    let cCur = 0;
    cleanIndices.forEach((stIdx, i) => {
      const extra = i < remClean ? 1 : 0;
      const count = baseClean + extra;
      resultStepMap[stIdx] = cleaningNums.slice(cCur, cCur + count);
      cCur += count;
    });
  }

  return stations.map((st, idx) => {
    const isClean = cleanIndices.includes(idx);
    const assignedSteps = resultStepMap[idx] || [];
    return {
      ...st,
      is_cleaning_station: isClean,
      station_type: isClean ? "CLEANING" : "ASSEMBLY",
      step_numbers: assignedSteps,
      rawStepsInput: assignedSteps.join(", ")
    };
  });
}
