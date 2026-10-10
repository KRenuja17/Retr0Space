package core

import (
	"fmt"
	"math"
	"math/rand"
	"strings"
)

type Planet struct {
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	Z    float64 `json:"z"`
	Spin float64 `json:"spin"`
}

var radii = [5]float64{5.1, 4.5, 5.8, 5.3, 4.8}
var phases = [5]float64{3.5, .3, 5.2, 2.1, .95}
var heights = [5]float64{1.35, 2.1, -.1, -1.9, -2.35}
var compactHeights = [5]float64{3.35, 1.4, -1.2, -3.85, -6.4}
var compactXs = [5]float64{-2.25, 2.15, -2.25, 2.15, -2.25}
var frequencies = [15]float64{24, 63, 81, 38, 72, 19, 55, 86, 31, 68, 42, 17, 78, 29, 57}

func Frame(t float64, compact bool) []Planet {
	result := make([]Planet, 5)
	for i := range result {
		a := phases[i] + t*(.006+float64(i)*.0008)
		y := heights[i] + math.Sin(t*.06+float64(i))*.08
		x, z := math.Cos(a)*radii[i], math.Sin(a)*radii[i]*.58
		if compact {
			y = compactHeights[i]
			x = compactXs[i] + math.Sin(t*.02+float64(i))*.06
			z *= .22
		}
		result[i] = Planet{x, y, z, t * (.032 + float64(i)*.005)}
	}
	return result
}

func Catalog(seed int64, count int) []float64 {
	if count < 0 {
		count = 0
	}
	if count > 6000 {
		count = 6000
	}
	random := rand.New(rand.NewSource(seed))
	result := make([]float64, 0, count*3)
	for i := 0; i < count; i++ {
		a := random.Float64() * math.Pi * 2
		y := random.Float64()*2 - 1
		r := 35 + random.Float64()*60
		planar := math.Sqrt(1-y*y) * r
		result = append(result, math.Cos(a)*planar, y*r, math.Sin(a)*planar)
	}
	return result
}

func Resonance(id int, dial float64) float64 {
	if id < 0 || id >= len(frequencies) || math.IsNaN(dial) {
		return 0
	}
	distance := (dial - frequencies[id]) / 18
	return math.Exp(-distance * distance)
}

// A discovery becomes a small local constellation within its world's region.
func Star(id int) (float64, float64) {
	world, echo := id/3, id%3
	anchors := [5][2]float64{{280, 410}, {630, 300}, {720, 670}, {300, 850}, {560, 1020}}
	offsets := [3][2]float64{{-38, 8}, {46, -50}, {22, 62}}
	return anchors[world][0] + offsets[echo][0], anchors[world][1] + offsets[echo][1]
}

func Poster(ids []int) string {
	var b strings.Builder
	b.WriteString(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1280" viewBox="0 0 960 1280"><rect width="960" height="1280" fill="#102c2a"/><g stroke="#e4e5cf" fill="none">`)
	b.WriteString(`<rect x="40" y="40" width="880" height="1200" stroke-opacity=".25"/><circle cx="480" cy="675" r="365" stroke-opacity=".12"/><circle cx="480" cy="675" r="385" stroke-opacity=".12"/><path d="M60 675h35m770 0h35M480 60v35m0 1090v35" stroke-opacity=".4"/>`)
	seen := map[int]bool{}
	valid := []int{}
	for _, id := range ids {
		if id >= 0 && id < 15 && !seen[id] {
			valid = append(valid, id)
			seen[id] = true
		}
	}
	for i, id := range valid {
		x, y := Star(id)
		if i > 0 {
			px, py := Star(valid[i-1])
			fmt.Fprintf(&b, `<path d="M%.1f %.1f Q480 %.1f %.1f %.1f" stroke-opacity=".48" stroke-width="1"/>`, px, py, (py+y)/2-30, x, y)
		}
		fmt.Fprintf(&b, `<circle cx="%.1f" cy="%.1f" r="18" stroke-opacity=".2"/><circle cx="%.1f" cy="%.1f" r="3" fill="#e4e5cf"/><path d="M%.1f %.1fh18m-9-9v18" stroke-opacity=".6"/>`, x, y, x, y, x-9, y)
	}
	b.WriteString(`</g><g fill="#e4e5cf" font-family="Bodoni,Georgia,serif"><text x="90" y="150" font-size="65" letter-spacing="-2">OTHERWHERE</text><text x="90" y="207" font-size="28" font-style="italic">A constellation of your own.</text>`)
	fmt.Fprintf(&b, `<text x="90" y="1160" font-size="22">%02d echoes / one singular journey</text>`, len(valid))
	b.WriteString(`</g><text x="90" y="1195" fill="#e4e5cf" opacity=".55" font-family="monospace" font-size="11" letter-spacing="2">THE OBSERVATORY / PERSONAL FIELD ATLAS</text></svg>`)
	return b.String()
}
