# Reverse Tower Defense

A lightweight browser game where you command raiders in a reverse tower defense scenario. Instead of placing towers, you spend command points to send units through an entrenched base. The project is built with vanilla HTML, CSS, and JavaScript so it can be deployed directly to GitHub Pages.

## Play the game

1. Serve the repository locally (for example with `python3 -m http.server`) or publish it to GitHub Pages.
2. Open `index.html` in your browser.
3. Spend command points on Scouts, Bruisers, or Tanks and try to push at least 20 units through the exit portal before the automated turrets stop them.


## Deploying to GitHub Pages

Because the project is a static site, you can deploy it straight from your repository without a build step:

1. Push the project to a GitHub repository (for example `username/reverse-tower-defense`).
2. In GitHub, navigate to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the branch you want to publish (commonly `main`), and set the folder to **/ (root)** since `index.html`, `style.css`, and `game.js` live at the top level.
5. Save the settings. GitHub will build the static site and provide a live URL once the deployment finishes (this can take a couple of minutes).

After the first publish, any commits pushed to the selected branch will automatically update the live site.

## Development

- All assets live in the project root (`index.html`, `style.css`, `game.js`).
- The game loop is implemented in `game.js` with a simple canvas renderer.
- No external dependencies are required.

Feel free to customize the path, towers, or unit stats to tweak the difficulty.
