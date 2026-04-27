//go:build testing

package hub

import (
	"github.com/henrygd/beszel/internal/hub/domains"
	"github.com/henrygd/beszel/internal/hub/monitors"
	"github.com/henrygd/beszel/internal/hub/systems"
)

// TESTING ONLY: GetSystemManager returns the system manager
func (h *Hub) GetSystemManager() *systems.SystemManager {
	return h.sm
}

// TESTING ONLY: GetPubkey returns the public key
func (h *Hub) GetPubkey() string {
	return h.pubKey
}

// TESTING ONLY: SetPubkey sets the public key
func (h *Hub) SetPubkey(pubkey string) {
	h.pubKey = pubkey
}

func (h *Hub) SetCollectionAuthSettings() error {
	return setCollectionAuthSettings(h)
}

// TESTING ONLY: GetDomainScheduler returns the domain scheduler
func (h *Hub) GetDomainScheduler() *domains.Scheduler {
	return h.domainSched
}

// TESTING ONLY: GetMonitorScheduler returns the monitor scheduler
func (h *Hub) GetMonitorScheduler() *monitors.Scheduler {
	return h.monSched
}
