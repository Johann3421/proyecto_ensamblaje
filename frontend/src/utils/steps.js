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

export function distributeStepsEqually(stepNumbers = [], stationCount = 1) {
  if (!stepNumbers || stepNumbers.length === 0 || stationCount <= 0) return [];
  const baseCount = Math.floor(stepNumbers.length / stationCount);
  const remainder = stepNumbers.length % stationCount;
  const result = [];
  let cur = 0;
  for (let i = 0; i < stationCount; i++) {
    const extra = i < remainder ? 1 : 0;
    const count = baseCount + extra;
    result.push(stepNumbers.slice(cur, cur + count));
    cur += count;
  }
  return result;
}

export function distributeStepsSeparatingCleaning(stations, modelSteps, customCleaningSet = null) {
  if (!stations || stations.length === 0) return [];
  let effectiveSteps = modelSteps || [];

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

  const cleanStations = stations.filter(st => Boolean(st.is_cleaning_station || st.station_type === "CLEANING"));
  const asmbStations = stations.filter(st => !Boolean(st.is_cleaning_station || st.station_type === "CLEANING"));

  const asmbDistribution = distributeStepsEqually(assemblyNums, asmbStations.length);
  const cleanDistribution = distributeStepsEqually(cleaningNums, cleanStations.length);

  let asmbIdx = 0;
  let cleanIdx = 0;

  return stations.map((st) => {
    const isClean = Boolean(st.is_cleaning_station || st.station_type === "CLEANING");
    let assignedSteps = [];
    if (isClean) {
      assignedSteps = cleanDistribution[cleanIdx] || [];
      cleanIdx++;
    } else {
      assignedSteps = asmbDistribution[asmbIdx] || [];
      asmbIdx++;
    }
    return {
      ...st,
      is_cleaning_station: isClean,
      station_type: isClean ? "CLEANING" : "ASSEMBLY",
      step_numbers: assignedSteps,
      rawStepsInput: assignedSteps.join(", ")
    };
  });
}
