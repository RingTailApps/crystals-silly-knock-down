/* Knock Over — global config. Rename the game by changing GAME_TITLE. */
window.KO = window.KO || {};
(function (KO) {
  KO.GAME_TITLE = "Crystals Silly Knock Down";
  KO.LOGO_LINES = ["Crystals", "Silly", "Knock Down"];
  KO.STUDIO = "RingTailApps";
  KO.SAVE_KEY = "knockover.save.v1";

  // Logical world (portrait-first). Everything scales to fit the screen.
  KO.W = 900;
  KO.H = 1400;
  KO.GROUND_Y = 1180;
  KO.VIEW_REGION = { x0: 40, x1: 905, y0: 300, y1: 1235 }; // area always kept on screen

  // Slingshot
  KO.SLING = { x: 175, y: 925 };      // ball rest position
  KO.SLING_BASE_Y = KO.GROUND_Y;
  KO.MAX_PULL = 150;                  // world units
  KO.MIN_PULL = 22;
  KO.LAUNCH_SPEED = 25;               // px per physics step at full pull
  KO.GRAB_RADIUS = 190;
  KO.BALL_R = 24;

  KO.STEP_MS = 1000 / 60;
  KO.GRAVITY_PER_STEP = 0.001 * KO.STEP_MS * KO.STEP_MS; // matches Matter gravity.scale=0.001, y=1

  // Candy palette: [highlight, base, shadow]
  KO.COLORS = {
    red:    ["#ff8fa3", "#ff3b5c", "#b3122f"],
    orange: ["#ffc68a", "#ff8a1f", "#c2520a"],
    yellow: ["#fff3a1", "#ffd52e", "#d19a00"],
    green:  ["#b6f78c", "#4fd34a", "#1f8f2a"],
    teal:   ["#9ff5ea", "#22d1c0", "#0d8c80"],
    blue:   ["#9fd2ff", "#3b8cff", "#1c4fc2"],
    purple: ["#e0b3ff", "#a855f7", "#6b21a8"],
    pink:   ["#ffc2ec", "#ff5fcf", "#c21f8d"],
    choco:  ["#a87452", "#6b3f24", "#3b200f"],
    jelly:  ["#c8fff4", "#5ff0d9", "#139c88"]
  };
  KO.PALETTE = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink"];

  KO.COMBO_WORDS = [
    [2, "Sweet!"], [4, "Tasty!"], [6, "Delicious!"], [8, "Smashing!"], [11, "Sugar Rush!"]
  ];
  KO.CLEAR_WORD = "Total Knockout!";
})(window.KO);
