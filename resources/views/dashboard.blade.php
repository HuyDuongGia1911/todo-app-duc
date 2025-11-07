@extends('layouts.app')

@section('content')
    <!-- <h1 class="mb-4 text-2xl font-bold">Dashboard</h1> -->

   <div
  id="react-dashboard"
  data-username="{{ $userName }}"
  data-taskcount="{{ $taskCount }}"
  data-dashboard="{{ json_encode($dashboardData) }}">
</div>

     @viteReactRefresh
   @vite('resources/js/app.jsx')
@endsection
