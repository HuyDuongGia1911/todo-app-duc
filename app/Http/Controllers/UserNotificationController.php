<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class UserNotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $limit = max(5, min((int) $request->get('limit', 30), 100));

        $notifications = $user->notifications()
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn(DatabaseNotification $notification) => [
                'id' => $notification->id,
                'type' => $notification->type,
                'data' => $notification->data,
                'read_at' => optional($notification->read_at)->toIso8601String(),
                'created_at' => optional($notification->created_at)->toIso8601String(),
            ]);

        return response()->json([
            'data' => $notifications,
        ]);
    }

    public function markAsRead(Request $request, DatabaseNotification $notification)
    {
        if ($notification->notifiable_id !== $request->user()->id || $notification->notifiable_type !== get_class($request->user())) {
            abort(403);
        }

        if (!$notification->read_at) {
            $notification->markAsRead();
        }

        return response()->json([
            'success' => true,
            'read_at' => optional($notification->read_at)->toIso8601String(),
        ]);
    }

    public function markAllRead(Request $request)
    {
        $user = $request->user();
        $user->notifications()->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
        ]);
    }
}
