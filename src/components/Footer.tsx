export default function Footer() {
  const shareText = encodeURIComponent(
    "Free AI ballot research tool — enter your zip code to get a custom research prompt for your ballot: ",
  );
  const shareUrl = encodeURIComponent("https://voterchoice.io");

  return (
    <footer className="bg-gray-800 text-gray-200 py-8 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-white mb-2">
            Share this tool
          </h2>
          <p className="text-gray-300 text-sm mb-3">
            If this was useful, share it with friends, family, or your
            community. It works for any U.S. state and any election.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on X (Twitter) (opens in new tab)"
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Share on X
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on Facebook (opens in new tab)"
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Share on Facebook
            </a>
          </div>
        </div>

        <hr className="border-gray-600" />

        <p className="text-gray-400 text-sm">
          Created by a human using AI tools, because everyone deserves to know
          what they&apos;re actually voting for.
        </p>
      </div>
    </footer>
  );
}
