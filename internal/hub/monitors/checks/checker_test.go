package checks

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/henrygd/beszel/internal/entities/monitor"
)

func TestHTTPCheckerReportsUpForSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	result := (&HTTPChecker{}).Check(context.Background(), &monitor.Monitor{
		URL:     server.URL,
		Timeout: 2,
	})

	if result.Status != monitor.StatusUp {
		t.Fatalf("expected status up, got %s: %s", result.Status, result.Msg)
	}
	if result.Ping < 0 {
		t.Fatalf("expected non-negative ping, got %d", result.Ping)
	}
}

func TestHTTPCheckerReportsDownForServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "broken", http.StatusInternalServerError)
	}))
	defer server.Close()

	result := (&HTTPChecker{}).Check(context.Background(), &monitor.Monitor{
		URL:     server.URL,
		Timeout: 2,
	})

	if result.Status != monitor.StatusDown {
		t.Fatalf("expected status down, got %s", result.Status)
	}
}

func TestKeywordCheckerHonorsKeywordAndInvert(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("service status ok"))
	}))
	defer server.Close()

	result := (&KeywordChecker{}).Check(context.Background(), &monitor.Monitor{
		URL:     server.URL,
		Timeout: 2,
		Keyword: "status ok",
	})
	if result.Status != monitor.StatusUp {
		t.Fatalf("expected keyword match to be up, got %s: %s", result.Status, result.Msg)
	}

	result = (&KeywordChecker{}).Check(context.Background(), &monitor.Monitor{
		URL:           server.URL,
		Timeout:       2,
		Keyword:       "status ok",
		InvertKeyword: true,
	})
	if result.Status != monitor.StatusDown {
		t.Fatalf("expected inverted keyword match to be down, got %s", result.Status)
	}
}

func TestJSONQueryCheckerMatchesNestedValue(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"status":"ok","version":2}}`))
	}))
	defer server.Close()

	result := (&JSONQueryChecker{}).Check(context.Background(), &monitor.Monitor{
		URL:           server.URL,
		Timeout:       2,
		JSONQuery:     "data.status",
		ExpectedValue: "ok",
	})
	if result.Status != monitor.StatusUp {
		t.Fatalf("expected json query match to be up, got %s: %s", result.Status, result.Msg)
	}

	result = (&JSONQueryChecker{}).Check(context.Background(), &monitor.Monitor{
		URL:           server.URL,
		Timeout:       2,
		JSONQuery:     "data.status",
		ExpectedValue: "down",
	})
	if result.Status != monitor.StatusDown {
		t.Fatalf("expected json query mismatch to be down, got %s", result.Status)
	}
}

func TestTCPCheckerUsesConfiguredHostAndPort(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()

	done := make(chan struct{})
	go func() {
		conn, err := listener.Accept()
		if err == nil {
			_ = conn.Close()
		}
		close(done)
	}()

	result := (&TCPChecker{}).Check(context.Background(), &monitor.Monitor{
		Hostname: "127.0.0.1",
		Port:     listener.Addr().(*net.TCPAddr).Port,
		Timeout:  2,
	})
	if result.Status != monitor.StatusUp {
		t.Fatalf("expected tcp check to be up, got %s: %s", result.Status, result.Msg)
	}
	<-done
}

func TestDNSCheckerResolvesLocalhost(t *testing.T) {
	result := (&DNSChecker{}).Check(context.Background(), &monitor.Monitor{
		Hostname:        "localhost",
		DNSResolverMode: "A",
		Timeout:         2,
	})
	if result.Status != monitor.StatusUp {
		t.Fatalf("expected localhost DNS to resolve, got %s: %s", result.Status, result.Msg)
	}
}
