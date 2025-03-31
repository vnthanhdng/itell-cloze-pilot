import React from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>iTELL Cloze Test Study</title>
        <meta name="description" content="A research study on cloze test generation methods" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <header className="bg-blue-700 text-white p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">iTELL Cloze Test</h1>
            </div>
          </div>
        </header>
        
        <main className="min-h-screen py-8">
          {children}
        </main>
        
        <footer className="bg-gray-100 p-6 mt-10">
          <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} iTELL Research Lab</p>
            <p className="mt-1">This is a research study to evaluate different methods for gap generation in cloze tests.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
