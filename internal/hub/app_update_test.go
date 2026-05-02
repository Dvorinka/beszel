package hub

import "testing"

func TestParseBearerChallenge(t *testing.T) {
	challenge := `Bearer realm="https://ghcr.io/token",service="ghcr.io",scope="repository:dvorinka/beszel:pull"`

	params := parseBearerChallenge(challenge)

	if params["realm"] != "https://ghcr.io/token" {
		t.Fatalf("realm = %q", params["realm"])
	}
	if params["service"] != "ghcr.io" {
		t.Fatalf("service = %q", params["service"])
	}
	if params["scope"] != "repository:dvorinka/beszel:pull" {
		t.Fatalf("scope = %q", params["scope"])
	}
}

func TestFindRepoDigest(t *testing.T) {
	digests := []string{
		"ghcr.io/other/image@sha256:111",
		"ghcr.io/dvorinka/beszel@sha256:222",
	}

	got := findRepoDigest(digests, "dvorinka/beszel")
	if got != "ghcr.io/dvorinka/beszel@sha256:222" {
		t.Fatalf("digest = %q", got)
	}
}

func TestDigestValue(t *testing.T) {
	for _, tc := range []struct {
		name string
		in   string
		want string
	}{
		{name: "repo digest", in: "ghcr.io/dvorinka/beszel@sha256:abc", want: "sha256:abc"},
		{name: "plain digest", in: "sha256:def", want: "sha256:def"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := digestValue(tc.in); got != tc.want {
				t.Fatalf("digestValue(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestCleanEndpointsConfig(t *testing.T) {
	input := map[string]map[string]any{
		"beszel": {
			"NetworkID":           "abc123",
			"EndpointID":          "ep456",
			"Gateway":             "172.20.0.1",
			"IPAddress":           "172.20.0.5",
			"IPPrefixLen":         16,
			"IPv6Gateway":         "",
			"GlobalIPv6Address":   "",
			"GlobalIPv6PrefixLen": 0,
			"MacAddress":          "02:42:ac:14:00:05",
			"Aliases":             []string{"beszel", "beszel-hub"},
			"Links":               nil,
			"IPAMConfig":          nil,
		},
		"bridge": {
			"NetworkID":  "bridge-net",
			"IPAddress":  "172.17.0.2",
			"Aliases":    []string{},
			"DriverOpts": map[string]string{},
		},
	}

	got := cleanEndpointsConfig(input)

	if got == nil {
		t.Fatal("cleanEndpointsConfig returned nil for non-nil input")
	}

	for netName, cfgRaw := range got {
		cfg, ok := cfgRaw.(map[string]any)
		if !ok {
			t.Fatalf("expected network %q config to be map[string]any, got %T", netName, cfgRaw)
		}
		for k := range cfg {
			switch k {
			case "NetworkID", "EndpointID", "Gateway", "IPAddress", "IPPrefixLen",
				"IPv6Gateway", "GlobalIPv6Address", "GlobalIPv6PrefixLen", "MacAddress":
				t.Fatalf("runtime field %q was NOT stripped from network %q", k, netName)
			}
		}
	}

	beszelCfg, ok := got["beszel"].(map[string]any)
	if !ok {
		t.Fatal("expected beszel network config to be map[string]any")
	}
	aliases, ok := beszelCfg["Aliases"].([]string)
	if !ok || len(aliases) != 2 || aliases[0] != "beszel" {
		t.Fatalf("expected Aliases to be preserved, got %v", beszelCfg["Aliases"])
	}

	bridgeCfg, ok := got["bridge"].(map[string]any)
	if !ok {
		t.Fatal("expected bridge network config to be map[string]any")
	}
	if _, ok := bridgeCfg["DriverOpts"]; !ok {
		t.Fatal("expected DriverOpts to be preserved in bridge network")
	}
}

func TestCleanEndpointsConfigNil(t *testing.T) {
	got := cleanEndpointsConfig(nil)
	if got != nil {
		t.Fatalf("expected nil, got %v", got)
	}
}
