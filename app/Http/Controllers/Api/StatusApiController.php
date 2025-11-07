<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Status;
use Illuminate\Http\Request;

class StatusApiController extends Controller
{
    public function index()
    {
        return response()->json(Status::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'status_name' => 'required|string|max:255',
        ]);

        $status = Status::create([
            'status_name' => $request->status_name,
        ]);

        return response()->json($status, 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'status_name' => 'required|string|max:255',
        ]);

        $status = Status::findOrFail($id);
        $status->update([
            'status_name' => $request->status_name,
        ]);

        return response()->json($status);
    }

    public function destroy($id)
    {
        $status = Status::findOrFail($id);
        $status->delete();

        return response()->json(['success' => true]);
    }
}
