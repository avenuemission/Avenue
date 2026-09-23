"use client";

import { useState } from "react";
import Link from "next/link";
import { APEST_ROLES, QUESTIONS, SCALE_OPTIONS, scoreApest, topRole, type ApestResults, type RoleKey } from "@/lib/apest";

export default function ApestQuizPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(QUESTIONS.length).fill(0));
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<ApestResults | null>(null);
  const [emailForm, setEmailForm] = useState({ email: "", name: "", website: "" });
  const [emailSent, setEmailSent] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [personalizedResponse, setPersonalizedResponse] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = value;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResults();
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateResults = async () => {
    const percentages = scoreApest(answers);

    setResults(percentages);
    setShowResults(true);
    setIsLoadingAI(true);

    // Fetch personalized response from OpenAI
    try {
      const response = await fetch("/api/apest-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: percentages }),
      });

      if (response.ok) {
        const data = await response.json();
        setPersonalizedResponse(data.response);
      }
    } catch (error) {
      console.error("Error fetching personalized results:", error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const getTopRole = (): RoleKey => {
    return results ? topRole(results) : "apostle";
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailForm.email && results) {
      try {
        // Submit to Netlify Forms
        const netlifyData = new FormData();
        netlifyData.append("form-name", "apest-results");
        netlifyData.append("name", emailForm.name);
        netlifyData.append("email", emailForm.email);
        netlifyData.append("apostle", `${results.apostle}%`);
        netlifyData.append("prophet", `${results.prophet}%`);
        netlifyData.append("evangelist", `${results.evangelist}%`);
        netlifyData.append("shepherd", `${results.shepherd}%`);
        netlifyData.append("teacher", `${results.teacher}%`);
        await fetch("/", {
          method: "POST",
          body: netlifyData,
        });

        // Send email with results and personalized message
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "apestResults",
            data: {
              name: emailForm.name,
              email: emailForm.email,
              results,
              personalizedMessage: personalizedResponse || APEST_ROLES[getTopRole()].leadershipBenefit,
              website: emailForm.website,
            },
          }),
        });
        setEmailSent(true);
      } catch (error) {
        console.error("Form submission error:", error);
      }
    }
  };

  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-blue-950/50 to-black animate-gradient-shift" />
        <div className="absolute inset-0 bg-gradient-to-tl from-blue-900/20 via-transparent to-blue-950/30 animate-gradient-shift-reverse" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse-slower" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        {!quizStarted && !showResults && (
          /* Introduction Section */
          <div className="text-center space-y-8">
            <Link
              href="/streetlights"
              className="inline-block text-blue-400 hover:text-blue-300 text-sm uppercase tracking-wider mb-8"
            >
              ← Back to Streetlights
            </Link>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              APEST QUIZ
            </h1>

            <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-8">
              Discover your unique gifting based on the Fivefold Gifts from Ephesians 4:11.
              Understanding your APEST profile helps you serve more effectively in community.
            </p>

            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700 rounded-xl p-8 max-w-2xl mx-auto text-left space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4 text-center">The Fivefold Gifts</h2>
              
              <div className="space-y-3">
                <p className="text-gray-300">
                  <span className="text-blue-400 font-semibold">Apostle:</span> {APEST_ROLES.apostle.description}
                </p>
                <p className="text-gray-300">
                  <span className="text-blue-400 font-semibold">Prophet:</span> {APEST_ROLES.prophet.description}
                </p>
                <p className="text-gray-300">
                  <span className="text-blue-400 font-semibold">Evangelist:</span> {APEST_ROLES.evangelist.description}
                </p>
                <p className="text-gray-300">
                  <span className="text-blue-400 font-semibold">Shepherd:</span> {APEST_ROLES.shepherd.description}
                </p>
                <p className="text-gray-300">
                  <span className="text-blue-400 font-semibold">Teacher:</span> {APEST_ROLES.teacher.description}
                </p>
              </div>
            </div>

            <p className="text-gray-400 text-sm">
              ⏱ Time to complete: approximately 5 minutes
            </p>

            <button
              onClick={() => setQuizStarted(true)}
              className="bg-blue-700 hover:bg-blue-600 text-white px-12 py-4 rounded-full font-medium transition-colors uppercase tracking-wider text-lg"
            >
              Start Quiz
            </button>
          </div>
        )}

        {quizStarted && !showResults && (
          /* Quiz Section */
          <div className="space-y-8">
            <Link
              href="/streetlights"
              className="inline-block text-blue-400 hover:text-blue-300 text-sm uppercase tracking-wider"
            >
              ← Back to Streetlights
            </Link>

            {/* Progress Bar */}
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-gray-400 text-sm text-center">
              Question {currentQuestion + 1} of {QUESTIONS.length}
            </p>

            {/* Question Card */}
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
              <h2 className="text-xl md:text-2xl font-medium text-white mb-8 text-center">
                {QUESTIONS[currentQuestion].text}
              </h2>

              {/* Scale Options */}
              <div className="space-y-3">
                {SCALE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(option.value)}
                    className={`w-full p-4 rounded-lg border transition-all duration-200 text-left ${
                      answers[currentQuestion] === option.value
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-4">
              <button
                onClick={prevQuestion}
                disabled={currentQuestion === 0}
                className={`px-8 py-3 rounded-full font-medium transition-colors uppercase tracking-wider text-sm ${
                  currentQuestion === 0
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                Previous
              </button>
              <button
                onClick={nextQuestion}
                disabled={answers[currentQuestion] === 0}
                className={`px-8 py-3 rounded-full font-medium transition-colors uppercase tracking-wider text-sm ${
                  answers[currentQuestion] === 0
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                    : "bg-blue-700 text-white hover:bg-blue-600"
                }`}
              >
                {currentQuestion === QUESTIONS.length - 1 ? "See Results" : "Next"}
              </button>
            </div>
          </div>
        )}

        {showResults && results && (
          /* Results Section */
          <div className="space-y-8">
            <Link
              href="/streetlights"
              className="inline-block text-blue-400 hover:text-blue-300 text-sm uppercase tracking-wider"
            >
              ← Back to Streetlights
            </Link>

            <h1 className="text-4xl md:text-5xl font-bold text-white text-center">
              Your APEST Profile
            </h1>

            {/* Results Chart */}
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700 rounded-xl p-8 space-y-6">
              {(Object.entries(results) as [RoleKey, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([role, percentage]) => (
                  <div key={role} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white font-medium capitalize">{role}</span>
                      <span className="text-blue-400">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-blue-400 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>

            {/* Personalized AI Response */}
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                Your Personalized Insights
              </h2>
              {isLoadingAI ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-gray-400 text-sm animate-pulse">Generating your personalized insights...</p>
                </div>
              ) : personalizedResponse ? (
                <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                  {personalizedResponse}
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-medium text-blue-400 capitalize mb-3">
                    Your Strongest Gift: {getTopRole()}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {APEST_ROLES[getTopRole()].leadershipBenefit}
                  </p>
                </div>
              )}
            </div>

            {/* Call to Action */}
            <div className="bg-gradient-to-r from-blue-900/40 to-blue-800/40 backdrop-blur-sm border border-blue-700/50 rounded-xl p-8 text-center">
              <h2 className="text-2xl font-semibold text-white mb-4">
                Start a Pathway Group
              </h2>
              <p className="text-gray-300 mb-6 max-w-xl mx-auto">
                Your unique gifting is exactly what&apos;s needed to lead others in community.
                Every APEST profile brings something essential to a pathway group.
                Consider starting one and using your gifts to help others grow.
              </p>
              <Link
                href="/pathways"
                className="inline-block bg-blue-700 hover:bg-blue-600 text-white px-10 py-4 rounded-full font-medium transition-colors uppercase tracking-wider"
              >
                Learn About Pathways
              </Link>
            </div>

            {/* Email Results Form */}
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
              <h3 className="text-xl font-semibold text-white mb-4 text-center">
                Email Your Results
              </h3>
              {!emailSent ? (
                <form
                  onSubmit={handleEmailSubmit}
                  className="space-y-4 max-w-md mx-auto"
                  data-netlify="true"
                  name="apest-results"
                >
                  <input type="hidden" name="form-name" value="apest-results" />
                  {/* Honeypot field - hidden from humans, bots will fill it */}
                  <input
                    type="text"
                    name="website"
                    value={emailForm.website}
                    onChange={(e) => setEmailForm({ ...emailForm, website: e.target.value })}
                    style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                  <div>
                    <label className="block text-gray-400 text-xs mb-2 uppercase tracking-wider">
                      Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={emailForm.name}
                      onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
                      className="w-full bg-transparent border-b-2 border-gray-700 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-2 uppercase tracking-wider">
                      Email
                    </label>
                    <input
                      type="email"
                      value={emailForm.email}
                      onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                      className="w-full bg-transparent border-b-2 border-gray-700 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="text-center pt-4">
                    <button
                      type="submit"
                      className="bg-blue-700 hover:bg-blue-600 text-white px-10 py-3 rounded-full font-medium transition-colors uppercase tracking-wider text-sm"
                    >
                      Send Results
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-green-400 text-center">
                  Your results have been sent! Check your email.
                </p>
              )}
            </div>

            {/* Retake Quiz */}
            <div className="text-center">
              <button
                onClick={() => {
                  setQuizStarted(false);
                  setShowResults(false);
                  setCurrentQuestion(0);
                  setAnswers(Array(QUESTIONS.length).fill(0));
                  setResults(null);
                  setEmailSent(false);
                  setPersonalizedResponse(null);
                  setIsLoadingAI(false);
                }}
                className="text-blue-400 hover:text-blue-300 text-sm uppercase tracking-wider"
              >
                Retake Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
