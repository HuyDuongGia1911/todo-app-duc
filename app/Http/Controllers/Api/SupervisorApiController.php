<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supervisor;
use Illuminate\Http\Request;

class SupervisorApiController extends Controller
{
    public function index()
    {
        return response()->json(Supervisor::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'supervisor_name' => 'required|string|max:255',
        ]);

        $supervisor = Supervisor::create([
            'supervisor_name' => $request->supervisor_name,
        ]);

        return response()->json($supervisor, 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'supervisor_name' => 'required|string|max:255',
        ]);

        $supervisor = Supervisor::findOrFail($id);
        $supervisor->update([
            'supervisor_name' => $request->supervisor_name,
        ]);

        return response()->json($supervisor);
    }

    public function destroy($id)
    {
        $supervisor = Supervisor::findOrFail($id);
        $supervisor->delete();

        return response()->json(['success' => true]);
    }
}
