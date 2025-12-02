<?php

namespace App\Services;

use App\Models\ApprovalLog;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class ApprovalLogger
{
    public static function record(
        string $entityType,
        int|string|null $entityId,
        string $action,
        array|Arrayable $payload = [],
        ?string $entityLabel = null
    ): ApprovalLog {
        $payloadArray = $payload instanceof Arrayable ? $payload->toArray() : $payload;

        $actor = Auth::user();

        return ApprovalLog::create([
            'entity_type'  => $entityType,
            'entity_id'    => $entityId,
            'entity_label' => $entityLabel,
            'action'       => $action,
            'actor_id'     => $actor?->id,
            'actor_name'   => $actor?->name,
            'actor_role'   => $actor?->role,
            'payload'      => empty($payloadArray) ? null : $payloadArray,
        ]);
    }

    public static function forModel(Model $model, string $action, array $payload = []): ApprovalLog
    {
        return self::record(
            strtolower(class_basename($model)),
            $model->getKey(),
            $action,
            $payload,
            method_exists($model, 'getAttribute') ? ($model->getAttribute('title') ?? $model->getAttribute('name')) : null
        );
    }
}
