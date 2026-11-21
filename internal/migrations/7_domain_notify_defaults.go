package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
)

// The notify_on_expiry / notify_on_ssl_expiry flags were stored but never
// consumed until now, so existing rows carry zeros that reflect "feature
// never worked", not user intent. The dialog defaults both to on; backfill
// to match so enabling the wiring does not silently mute existing domains.
func init() {
	m.Register(func(app core.App) error {
		if _, err := app.DB().NewQuery(`UPDATE domains SET notify_on_expiry = 1 WHERE notify_on_expiry = 0`).Execute(); err != nil {
			return err
		}
		_, err := app.DB().NewQuery(`UPDATE domains SET notify_on_ssl_expiry = 1 WHERE notify_on_ssl_expiry = 0`).Execute()
		return err
	}, func(app core.App) error {
		return nil
	})
}
