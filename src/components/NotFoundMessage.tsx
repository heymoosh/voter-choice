interface NotFoundMessageProps {
  zipCode: string;
}

export function NotFoundMessage({ zipCode }: NotFoundMessageProps) {
  return (
    <div
      data-testid="not-found-message"
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"
    >
      <h2 className="text-base font-semibold mb-1">Zip code not found</h2>
      <p className="text-sm">
        We don&apos;t have data for zip code <strong>{zipCode}</strong> yet.
        We&apos;re working on adding all U.S. zip codes.{" "}
        <a
          href="https://www.usa.gov/election-office"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          Find your state election website
        </a>{" "}
        to get official information.
      </p>
    </div>
  );
}
