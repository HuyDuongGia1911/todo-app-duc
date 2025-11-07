<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaskType;
use Illuminate\Http\Request;

class TypeApiController extends Controller
{
    public function index()
    {
        return response()->json(TaskType::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'type_name' => 'required|string|max:255',
        ]);

        $type = TaskType::create([
            'type_name' => $request->type_name,
        ]);

        return response()->json($type, 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'type_name' => 'required|string|max:255',
        ]);

        $type = TaskType::findOrFail($id);
        $type->update([
            'type_name' => $request->type_name,
        ]);

        return response()->json($type);
    }

    public function destroy($id)
    {
        $type = TaskType::findOrFail($id);
        $type->delete();

        return response()->json(['success' => true]);
    }
}
