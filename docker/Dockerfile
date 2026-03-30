FROM mcr.microsoft.com/playwright:v1.52.0-noble

# Use the pre-installed browsers from the base image; don't re-download during npm install
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user (Playwright image runs as root by default)
RUN useradd -m -s /bin/bash runner

# Set up workspace
WORKDIR /workspace

USER runner
