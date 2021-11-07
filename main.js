const path = require("path");
const { BrowserWindow, app, Menu, ipcMain, shell } = require("electron");
const log = require("electron-log");
const imagemin = require("imagemin");
const slash = require("slash");
const imageminMozjpeg = require("imagemin-mozjpeg");
const imageminPngquant = require("imagemin-pngquant");

process.env.NODE_ENV = "production";
log.transports.console.level = false;

const isMac = process.platform === "darwin";
const isDev = process.env.NODE_ENV === "development";

let mainWindow;
let aboutWindow;

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    show: false,
    width: isDev ? 800 : 500,
    height: 600,
    title: "Optimager",
    icon: `${__dirname}/app/assets/icon.png`,
    resizable: isDev,
    backgroundColor: "white",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (isDev) mainWindow.webContents.openDevTools();

  mainWindow.loadFile(path.join(__dirname, "app/index.html"));
  mainWindow.once("ready-to-show", mainWindow.show);
};

const createAboutWindow = () => {
  aboutWindow = new BrowserWindow({
    width: 350,
    height: 250,
    title: "About - OptImg",
    icon: `${__dirname}/app/assets/icon.png`,
    resizable: isDev,
    backgroundColor: "white",
    autoHideMenuBar: !isMac,
    parent: mainWindow,
    modal: true,
    show: false,
  });

  aboutWindow.loadFile(path.join(__dirname, "app/about.html"));
  aboutWindow.once("ready-to-show", aboutWindow.show);
};

const appMenu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [{ label: "About", click: createAboutWindow }],
        },
      ]
    : []),
  { role: "fileMenu" },
  ...(!isMac
    ? [
        {
          label: "Help",
          submenu: [{ label: "About", click: createAboutWindow }],
        },
      ]
    : []),
  ...(isDev
    ? [
        {
          label: "Developer",
          submenu: [
            { role: "reload" },
            { role: "forceReload" },
            { role: "separator" },
            { role: "toggledevtools" },
          ],
        },
      ]
    : []),
];

ipcMain.on("image:resize", async (e, data) => {
  const { imgPath, quality, outPath } = data;

  try {
    const files = await imagemin([slash(imgPath)], {
      destination: outPath,
      plugins: [
        imageminMozjpeg({ quality }),
        imageminPngquant({
          quality: [quality / 100, quality / 100],
        }),
      ],
    });

    shell.openPath(outPath);
    mainWindow.webContents.send("image:compressed");
    log.info(files);
  } catch (error) {
    log.error(error);
    mainWindow.webContents.send("image:error");
  }
});

app.on("ready", () => {
  createMainWindow();

  const mainMenu = Menu.buildFromTemplate(appMenu);
  Menu.setApplicationMenu(mainMenu);

  mainWindow.on("closed", () => (mainWindow = null));
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.on("window-all-closed", !isMac ? app.quit : () => {});
