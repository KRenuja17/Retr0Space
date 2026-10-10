//go:build js && wasm

package main

import (
	"encoding/json"
	"otherwhere/universe/core"
	"syscall/js"
)

var functions []js.Func

func bind(object js.Value, name string, callback func(js.Value, []js.Value) any) {
	fn := js.FuncOf(callback)
	functions = append(functions, fn)
	object.Set(name, fn)
}
func main() {
	object := js.Global().Get("Object").New()
	bind(object, "frame", func(_ js.Value, args []js.Value) any {
		data, _ := json.Marshal(core.Frame(args[0].Float(), args[1].Bool()))
		return string(data)
	})
	bind(object, "catalog", func(_ js.Value, args []js.Value) any {
		data, _ := json.Marshal(core.Catalog(int64(args[0].Int()), args[1].Int()))
		return string(data)
	})
	bind(object, "resonance", func(_ js.Value, args []js.Value) any { return core.Resonance(args[0].Int(), args[1].Float()) })
	bind(object, "poster", func(_ js.Value, args []js.Value) any {
		var ids []int
		json.Unmarshal([]byte(args[0].String()), &ids)
		return core.Poster(ids)
	})
	object.Set("version", "go-wasm-1")
	js.Global().Set("goUniverse", object)
	js.Global().Call("dispatchEvent", js.Global().Get("Event").New("otherwhere:engine-ready"))
	select {}
}
