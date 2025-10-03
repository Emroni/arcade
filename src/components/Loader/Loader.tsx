export function Loader() {
    return (
        <div className="flex flex-col items-center justify-center min-h-dvh">
            <svg
                className="animate-spin"
                fill="none"
                height="80"
                viewBox="0 0 80 80"
                width="80"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle cx="40" cy="40" fill="none" opacity="0.2" r="30" stroke="currentColor" strokeWidth="8" />
                <path d="M70 40 A30 30 0 0 0 40 10" fill="none" opacity="0.8" stroke="currentColor" strokeWidth="8" />
            </svg>
        </div>
    );
}
