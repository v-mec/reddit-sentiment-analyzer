import time
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import praw
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from multiprocessing import Pool


def process_comment(comment):
    analyzer = SentimentIntensityAnalyzer()
    vs = analyzer.polarity_scores(comment.body)
    return vs


if __name__ == "__main__":
    redditApi = praw.Reddit(
        client_id="SNir6y4WwNNs19S9H1W95Q",
        client_secret="-2-ZohQFFboLQMCrgT1uYKkcpTT64A",
        user_agent="comment-analyzer",
    )

    app = Flask(__name__)
    CORS(app)

    @app.route("/comments/url=<path:submissionUrl>")
    def comments(submissionUrl):
        try:
            submission = redditApi.submission(url=submissionUrl)
        except:
            return "Invalid url", 400

        submission.comments.replace_more()

        return jsonify([comment.body for comment in submission.comments.list()])

    @app.route("/analyze/url=<path:submissionUrl>")
    def analyze(submissionUrl):
        useThreads = request.headers.get("useThreads") == "true"

        print("Loading comments")

        try:
            submission = redditApi.submission(url=submissionUrl)
        except:
            return "Invalid url", 400

        submission.comments.replace_more()

        print("Calulating sentiment")

        startTime = time.time()

        pool = Pool() if useThreads else Pool(processes=1)

        results = pool.map(process_comment, submission.comments.list())

        endTime = time.time()

        commentCount = len(results)
        compoundAvg = sum([result["compound"] for result in results]) / commentCount
        minCompound = min([result["compound"] for result in results])
        maxCompound = max([result["compound"] for result in results])

        # print(
        #     f"Analyzed {commentCount} comments. Average compound score: {compoundAvg}. Min: {minCompound}. Max: {maxCompound}. Execution time: {endTime - startTime}s"
        # )

        return jsonify(
            {
                "count": commentCount,
                "avg": compoundAvg,
                "min": minCompound,
                "max": maxCompound,
                "time": endTime - startTime,
            }
        )

    @app.route("/<path:path>")
    def script(path):
        return send_from_directory("./fe/dist", path)

    @app.route("/")
    def index():
        return send_from_directory("./fe/dist", "index.html")

    app.run(port=8000)
