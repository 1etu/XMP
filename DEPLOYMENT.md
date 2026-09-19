# GitHub Pages

The source stays in `1etu/XMP`. The public build and campaign live in `1etu/xmb-test-portfolio`.

The live address is https://1etu.github.io/xmb-test-portfolio/.

## Publish an update

The script requires PowerShell, Git, pnpm, and GitHub CLI access to both repositories.

1. Commit and push the source changes to `1etu/XMP`.
2. Run `powershell -File scripts/publish-pages.ps1` from the source checkout.
3. Wait for the Pages deployment in `1etu/xmb-test-portfolio` to finish.
4. Open the site and a direct project link, such as `/work/nos4/`.

The script builds with `/xmb-test-portfolio/` as the base path. It copies the build and campaign into a separate temporary checkout. It gets the author name and email from the source repository's GitHub commit API. It does not add a coauthor.

Pages uses the `main` branch and root directory. The build includes `.nojekyll`, direct-route entry files, and a fallback page. `deployment.json` records the source commit.

## Static-host limits

GitHub Pages cannot run the Node visitor-count endpoint. The Pages build shows a dash and does not send presence requests. The local production server retains the live count.

Sites can block iframe embedding through their own headers. The browser view retains an external-tab action for those sites.
