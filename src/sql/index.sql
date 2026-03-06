-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 05, 2025 at 01:46 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `jeremyfitnessapp`
--

-- --------------------------------------------------------

--
-- Table structure for table `giveaways`
--

CREATE TABLE `giveaways` (
  `id` int(11) NOT NULL,
  `giveaway_product_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `follow_sapien` tinyint(1) DEFAULT 0,
  `follow_jeremy3pt0` tinyint(1) DEFAULT 0,
  `like_post_x` tinyint(1) DEFAULT 0,
  `share_post_x` tinyint(1) DEFAULT 0,
  `connect_discord` tinyint(1) DEFAULT 0,
  `connect_bitcoin` tinyint(1) DEFAULT 0,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `status` enum('active','expired','completed') DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `giveaway_products`
--

CREATE TABLE `giveaway_products` (
  `id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `price` decimal(10,2) DEFAULT 0.00,
  `image_url` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `giveaway_products`
--

INSERT INTO `giveaway_products` (`id`, `product_name`, `price`, `image_url`, `created_at`) VALUES
(1, 'Sapien Eleven T-Shirt', 25.00, 'https://yourcdn.com/images/tshirt.png', '2025-05-29 19:15:15'),
(2, 'Sapien Eleven T-Shirt Black', 35.00, 'https://yourcdn.com/images/tshirt.png', '2025-05-29 19:15:52');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `updates_news_podcast` tinyint(1) DEFAULT 1,
  `hai_alerts` tinyint(1) DEFAULT 1,
  `exercise_alerts` tinyint(1) DEFAULT 1,
  `nutrition_alerts` tinyint(1) DEFAULT 1,
  `coaching_alerts` tinyint(1) DEFAULT 1,
  `giveaway_alerts` tinyint(1) DEFAULT 1,
  `lore_alerts` tinyint(1) DEFAULT 1,
  `new_product` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `profilesettings`
--

CREATE TABLE `profilesettings` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `updates_news` tinyint(1) DEFAULT 0,
  `hai_alerts` tinyint(1) DEFAULT 0,
  `exercise_alerts` tinyint(1) DEFAULT 0,
  `nutrition_alerts` tinyint(1) DEFAULT 0,
  `coaching_alerts` tinyint(1) DEFAULT 0,
  `giveaway_alerts` tinyint(1) DEFAULT 0,
  `lore_alerts` tinyint(1) DEFAULT 0,
  `new_product_alerts` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `profilesettings`
--

INSERT INTO `profilesettings` (`id`, `userId`, `updates_news`, `hai_alerts`, `exercise_alerts`, `nutrition_alerts`, `coaching_alerts`, `giveaway_alerts`, `lore_alerts`, `new_product_alerts`, `created_at`, `updated_at`) VALUES
(14, 126, 0, 0, 1, 1, 1, 1, 1, 0, '2025-09-05 11:10:36', '2025-09-05 11:34:47');

-- --------------------------------------------------------

--
-- Table structure for table `referrals`
--

CREATE TABLE `referrals` (
  `id` int(11) NOT NULL,
  `referrer_id` int(11) NOT NULL,
  `referee_id` int(11) NOT NULL,
  `points` int(11) DEFAULT 50,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reminder`
--

CREATE TABLE `reminder` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `hai_reminder` tinyint(1) DEFAULT 0,
  `coaching_reminder` tinyint(1) DEFAULT 0,
  `s11_reminder` tinyint(1) DEFAULT 1,
  `drink_reminder` tinyint(1) DEFAULT 1,
  `stand_reminder` tinyint(1) DEFAULT 1,
  `sleep_reminder` tinyint(1) DEFAULT 1,
  `reminder_time` varchar(255) DEFAULT NULL,
  `frequency` enum('daily','weekly','monthly') DEFAULT 'daily',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `profilePicture` varchar(255) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT 1,
  `level` int(11) DEFAULT 1,
  `isCryptoWallet` tinyint(1) DEFAULT 1,
  `role` varchar(255) DEFAULT 'user',
  `referralCode` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `gender` enum('Male','Female') DEFAULT NULL,
  `otp` int(11) DEFAULT NULL,
  `otpExpiry` datetime DEFAULT NULL,
  `prefferedName` varchar(255) DEFAULT NULL,
  `birthdate` datetime DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `height` float DEFAULT NULL,
  `healthCondition` varchar(255) DEFAULT NULL,
  `allergies` varchar(255) DEFAULT NULL,
  `exerciseLimitation` varchar(255) DEFAULT NULL,
  `wellness` varchar(255) DEFAULT NULL,
  `dietary` varchar(255) DEFAULT NULL,
  `userId` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `name`, `profilePicture`, `isActive`, `level`, `isCryptoWallet`, `role`, `referralCode`, `created_at`, `updated_at`, `gender`, `otp`, `otpExpiry`, `prefferedName`, `birthdate`, `country`, `height`, `healthCondition`, `allergies`, `exerciseLimitation`, `wellness`, `dietary`, `userId`) VALUES
(126, 'test8@yopmail.com', '$2b$10$aR.GXR7yx9wzesDhofBV3.hUDbl9HBfjAV4p5xLhMeceDitGxn0AW', 'test', NULL, 1, 1, 1, 'user', NULL, '2025-09-05 11:10:36', '2025-09-05 11:10:36', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '4ad9d3e3-16dc-4261-985d-a1ad511f79de');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `giveaways`
--
ALTER TABLE `giveaways`
  ADD PRIMARY KEY (`id`),
  ADD KEY `giveaway_product_id` (`giveaway_product_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `giveaway_products`
--
ALTER TABLE `giveaway_products`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `profilesettings`
--
ALTER TABLE `profilesettings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- Indexes for table `referrals`
--
ALTER TABLE `referrals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `referrer_id` (`referrer_id`),
  ADD KEY `referee_id` (`referee_id`);

--
-- Indexes for table `reminder`
--
ALTER TABLE `reminder`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email` (`email`),
  ADD UNIQUE KEY `userId` (`userId`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `userId_2` (`userId`),
  ADD UNIQUE KEY `email_2` (`email`),
  ADD UNIQUE KEY `userId_3` (`userId`),
  ADD UNIQUE KEY `email_3` (`email`),
  ADD UNIQUE KEY `userId_4` (`userId`),
  ADD UNIQUE KEY `email_4` (`email`),
  ADD UNIQUE KEY `userId_5` (`userId`),
  ADD UNIQUE KEY `email_5` (`email`),
  ADD UNIQUE KEY `userId_6` (`userId`),
  ADD UNIQUE KEY `email_6` (`email`),
  ADD UNIQUE KEY `userId_7` (`userId`),
  ADD UNIQUE KEY `email_7` (`email`),
  ADD UNIQUE KEY `userId_8` (`userId`),
  ADD UNIQUE KEY `email_8` (`email`),
  ADD UNIQUE KEY `userId_9` (`userId`),
  ADD UNIQUE KEY `email_9` (`email`),
  ADD UNIQUE KEY `userId_10` (`userId`),
  ADD UNIQUE KEY `email_10` (`email`),
  ADD UNIQUE KEY `userId_11` (`userId`),
  ADD UNIQUE KEY `email_11` (`email`),
  ADD UNIQUE KEY `userId_12` (`userId`),
  ADD UNIQUE KEY `email_12` (`email`),
  ADD UNIQUE KEY `userId_13` (`userId`),
  ADD UNIQUE KEY `email_13` (`email`),
  ADD UNIQUE KEY `userId_14` (`userId`),
  ADD UNIQUE KEY `email_14` (`email`),
  ADD UNIQUE KEY `userId_15` (`userId`),
  ADD UNIQUE KEY `email_15` (`email`),
  ADD UNIQUE KEY `userId_16` (`userId`),
  ADD UNIQUE KEY `email_16` (`email`),
  ADD UNIQUE KEY `userId_17` (`userId`),
  ADD UNIQUE KEY `email_17` (`email`),
  ADD UNIQUE KEY `userId_18` (`userId`),
  ADD UNIQUE KEY `email_18` (`email`),
  ADD UNIQUE KEY `userId_19` (`userId`),
  ADD UNIQUE KEY `email_19` (`email`),
  ADD UNIQUE KEY `userId_20` (`userId`),
  ADD UNIQUE KEY `email_20` (`email`),
  ADD UNIQUE KEY `userId_21` (`userId`),
  ADD UNIQUE KEY `email_21` (`email`),
  ADD UNIQUE KEY `userId_22` (`userId`),
  ADD UNIQUE KEY `email_22` (`email`),
  ADD UNIQUE KEY `userId_23` (`userId`),
  ADD UNIQUE KEY `email_23` (`email`),
  ADD UNIQUE KEY `userId_24` (`userId`),
  ADD UNIQUE KEY `email_24` (`email`),
  ADD UNIQUE KEY `userId_25` (`userId`),
  ADD UNIQUE KEY `email_25` (`email`),
  ADD UNIQUE KEY `userId_26` (`userId`),
  ADD UNIQUE KEY `email_26` (`email`),
  ADD UNIQUE KEY `userId_27` (`userId`),
  ADD UNIQUE KEY `email_27` (`email`),
  ADD UNIQUE KEY `userId_28` (`userId`),
  ADD UNIQUE KEY `email_28` (`email`),
  ADD UNIQUE KEY `userId_29` (`userId`),
  ADD UNIQUE KEY `email_29` (`email`),
  ADD UNIQUE KEY `userId_30` (`userId`),
  ADD UNIQUE KEY `email_30` (`email`),
  ADD UNIQUE KEY `userId_31` (`userId`),
  ADD UNIQUE KEY `users_referral_code` (`referralCode`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `giveaways`
--
ALTER TABLE `giveaways`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `giveaway_products`
--
ALTER TABLE `giveaway_products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `profilesettings`
--
ALTER TABLE `profilesettings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `referrals`
--
ALTER TABLE `referrals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reminder`
--
ALTER TABLE `reminder`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=127;
