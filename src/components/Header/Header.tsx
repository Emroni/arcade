export function Header() {
    return (
        <header className="bg-stone-900 flex justify-between p-2">
            <h1>Arcade</h1>
            <div>
                <a href="https://github.com/Emroni/arcade" rel="noreferrer" target="_blank" title="View on GitHub">
                    <picture>
                        <img alt="GitHub" className="h-6 w-6" src="/github-mark-white.svg" />
                    </picture>
                </a>
            </div>
        </header>
    );
}
