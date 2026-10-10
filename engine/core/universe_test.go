package core

import (
	"encoding/xml"
	"math"
	"reflect"
	"strings"
	"testing"
)

func TestUniverseIsFiniteAndRepeatable(t *testing.T) {
	if !reflect.DeepEqual(Catalog(1701, 100), Catalog(1701, 100)) {
		t.Fatal("Catalog is not repeatable")
	}
	for _, compact := range []bool{false, true} {
		for _, time := range []float64{0, 10, 1e6} {
			for _, p := range Frame(time, compact) {
				if math.IsNaN(p.X) || math.IsInf(p.Z, 0) || math.Abs(p.X) > 7 || math.Abs(p.Y) > 7 {
					t.Fatal("Invalid orbit")
				}
			}
		}
	}
	if len(Catalog(1, -1)) != 0 || len(Catalog(1, 99999)) != 18000 {
		t.Fatal("Catalog allocation is unbounded")
	}
}
func TestSignalHasAnAttainableLock(t *testing.T) {
	for id, target := range frequencies {
		if Resonance(id, target) != 1 || Resonance(id, target+4) >= .97 {
			t.Fatal("Invalid lock window")
		}
	}
	if Resonance(-1, 50) != 0 || Resonance(15, 50) != 0 {
		t.Fatal("Unknown signals must be rejected")
	}
}
func TestPosterRejectsInvalidAndDuplicateDiscoveries(t *testing.T) {
	poster := Poster([]int{-1, 0, 0, 14, 99})
	if !strings.Contains(poster, "02 echoes") {
		t.Fatal("Poster counted invalid records")
	}
	var parsed struct{ XMLName xml.Name }
	if err := xml.Unmarshal([]byte(poster), &parsed); err != nil {
		t.Fatal(err)
	}
}
