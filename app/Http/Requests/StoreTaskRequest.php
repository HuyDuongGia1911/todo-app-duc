<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'        => ['required', 'string', 'max:255'],
            'deadline_at'  => ['nullable', 'date'],
            'priority'     => ['nullable', 'string', 'max:255'],
            // Chế độ lai:
            'user_id'      => ['nullable', 'integer', 'exists:users,id'],
            'user_ids'     => ['nullable', 'array'],
            'user_ids.*'   => ['integer', 'exists:users,id'],
        ];
    }
}
