"use client";

export default function ShareButton() {
  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: "Voter Choice — AI Ballot Research",
        text: "Free AI ballot research tool — enter your zip code and get a personalized prompt for any AI chatbot.",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
  }

  return (
    <button
      onClick={handleShare}
      className="text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2 min-h-[44px] flex items-center"
    >
      Share this tool
    </button>
  );
}
