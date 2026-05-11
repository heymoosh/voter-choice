export function Footer() {
  const shareText = encodeURIComponent(
    "Free tool to research your ballot with AI: ",
  );
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <footer className="w-full border-t border-gray-200 py-6 mt-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <div className="flex gap-4">
          <a
            href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            Share this tool
          </a>
        </div>
        <p>Created by a human using AI tools</p>
      </div>
    </footer>
  );
}
