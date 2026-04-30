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
