import vader from "vader-sentiment";

const input = document.getElementById("input");
const loading = document.getElementById("loading");
const card = document.getElementById("card");
const result = document.getElementById("result");

const handleData = (avg, count, time) => {
  input.classList.remove("is-invalid");
  loading.classList.add("d-none");
  card.classList.remove("d-none");

  if (avg <= -0.05) {
    result.innerText = "Negative";
    result.classList.add("text-danger");
  } else if (avg >= 0.05) {
    result.innerText = "Positive";
    result.classList.add("text-success");
  } else {
    result.innerText = "Neutral";
    result.classList.add("text-muted");
  }

  document.getElementById("avg").innerText = avg;
  document.getElementById("count").innerText = count;
  document.getElementById("time").innerText = time + "s";
};

const handleError = () => {
  loading.classList.add("d-none");
  input.classList.add("is-invalid");
};

document.getElementById("form").addEventListener("submit", (e) => {
  e.preventDefault();

  const url = e.target[0].value;
  const useThreads = e.target[1].checked;
  const inBrowser = e.target[2].checked;

  document.getElementById("loading").classList.remove("d-none");
  card.classList.add("d-none");
  result.classList.remove("text-danger", "text-success", "text-muted");

  if (inBrowser)
    return fetch(`http://localhost:8000/comments/url=${url}`)
      .then((res) => res.json())
      .then((data) => {
        const startTime = performance.now();

        if (useThreads) {
          const numWorkers = navigator.hardwareConcurrency;
          const pool = [];
          const results = [];

          for (let i = 0; i < numWorkers; i++) {
            const worker = new Worker(new URL("./worker.js", import.meta.url));

            worker.onmessage = (e) => {
              results.push(e.data);

              if (results.length === data.length) {
                const sum = data.reduce(
                  (acc, curr) =>
                    acc +
                    vader.SentimentIntensityAnalyzer.polarity_scores(curr)
                      .compound,
                  0
                );

                const endTime = performance.now();

                handleData(
                  sum / data.length,
                  data.length,
                  (endTime - startTime) / 1000
                );
              }
            };

            pool[i] = worker;
          }

          data.map((comment, i) => {
            const worker = pool[i % numWorkers];
            worker.postMessage(comment);
          });

          return;
        }

        const sum = data.reduce(
          (acc, curr) =>
            acc +
            vader.SentimentIntensityAnalyzer.polarity_scores(curr).compound,
          0
        );

        const endTime = performance.now();

        handleData(
          sum / data.length,
          data.length,
          (endTime - startTime) / 1000
        );
      });

  fetch(`http://localhost:8000/analyze/url=${url}`, {
    method: "GET",
    headers: {
      useThreads,
    },
  })
    .then((res) => res.json())
    .then((data) => handleData(data.avg, data.count, data.time))
    .catch(handleError);
});
