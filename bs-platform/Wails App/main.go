package main

import (
	"embed"
	"log"

	"bs-platform-studio/internal/app"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	studioApp := app.New()

	err := wails.Run(&options.App{
		Title:     "BS Platform Studio",
		Width:     1440,
		Height:    900,
		MinWidth:  1100,
		MinHeight: 700,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 9, G: 9, B: 11, A: 255},
		OnStartup:        studioApp.Startup,
		OnShutdown:       studioApp.Shutdown,
		Bind: []interface{}{
			studioApp,
		},
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			Theme:                windows.Dark,
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
