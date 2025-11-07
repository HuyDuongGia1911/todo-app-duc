<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaskTitle;
use Illuminate\Http\Request;

class TitleApiController extends Controller
{
    public function index()
    {
        return response()->json(TaskTitle::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'title_name' => 'required|string|max:255',
        ]);

        $title = TaskTitle::create([
            'title_name' => $request->title_name,
        ]);

        return response()->json($title, 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'title_name' => 'required|string|max:255',
        ]);

        $title = TaskTitle::findOrFail($id);
        $title->update([
            'title_name' => $request->title_name,
        ]);

        return response()->json($title);
    }

    public function destroy($id)
    {
        $title = TaskTitle::findOrFail($id);
        $title->delete();

        return response()->json(['success' => true]);
    }
}
