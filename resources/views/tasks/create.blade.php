@extends('layouts.app')

@section('content')
  <div
    id="react-task-create"
    data-redirect="{{ route('tasks.index') }}"
    data-back="{{ route('tasks.index') }}"
  ></div>
@endsection