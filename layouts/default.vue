<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <img src="/logo.png" class="logo" alt="AquaShare">
        <div>
          <p class="name">AquaShare</p>
          <p class="sub">paste · detect · share</p>
        </div>
      </div>
      <NuxtLink to="/" class="top-btn">New</NuxtLink>
    </header>
    <main class="main">
      <div class="main-inner">
        <slot />
      </div>
    </main>
  </div>
</template>