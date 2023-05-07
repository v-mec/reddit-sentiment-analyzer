import vader from "vader-sentiment";

onmessage = (e) => {
  postMessage(
    vader.SentimentIntensityAnalyzer.polarity_scores(e.data).compound
  );
};
