# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS with no build step, built and run locally for now. There is no admin panel yet; the user deferred it. Keep prices and studio data in one data file so a simple admin can be added later. Hosting and domain are not chosen yet.

## Users

- **Schoolchildren and their parents.** Kids' master classes and "turnkey" creative birthday parties.
- **Young couples.** A date at the potter's wheel ("Свидание за гончарным кругом").
- **Creative adults looking for a hobby or leisure.**
- **People who want to learn clay and plaster work** to make things for themselves or as gifts.

Visitors come from Yandex Maps, VK and links, and many are on phones.

## Product Purpose

A one-page landing site for «Сенсорика», a creative workshop in Cheboksary. The studio offers clay (potter's wheel and hand modelling), plaster, master classes, dates for two and children's birthdays. The site should make visitors want to try the craft and then book a live session. Success means booking through YClients online booking or a message in VK.

## Positioning

A warm, homely handmade workshop where anyone, from a child to a couple on a date, makes a real object with their own hands and takes it home. The hero is an interactive 3D demo that opens with a choice of two activities. On the potter's wheel the full cycle runs: lump of clay → potter's wheel → painting → glaze and kiln firing → finished piece. In decorating, the visitor picks a ready bisque blank (mug, container candle holder, vase, plate, picture tile, roly-poly doll or matryoshka) and paints it. The tools are brushes, ornament belts, stamp symbols (heart, star, leaf, sun, a face for the dolls and others) and the visitor's own movable text, straight or on an arc that runs around the plate rim. Then they glaze and fire it. The studio makes container candle holders (a ceramic tumbler with poured wax), not stemmed candlesticks. Both end with a postcard to save or share. It lets the visitor feel the craft before booking.

## Operating Context

- Booking goes through **VK** (https://vk.ru/sensorika21) and **YClients online booking** inside VK: https://vk.ru/app51715800.
- VK services page: https://vk.ru/uslugi-200653634. It could not be read automatically because of a bot check.
- Address: Cheboksary, Эгерский бульвар, 42 (from Yandex Maps, org id 146453008590). Open daily 09:00–22:00.
- Studio photos supplied by the client are in `photos/`; web versions (≤1400 px) are in `assets/img/gallery/`.
- No vector logo exists; only the PNG files in `assets/img/`.

## Capabilities and Constraints

- The 3D mini-game in the hero must be realistic 3D, work on touch devices and be skippable. No sound for now. No promo code or reward at the end.
- Confirmed prices: **children's creative birthday party**, 3 h studio rental, price for 10 children, adults free if they do not take part in the master class.
  - Эконом «Радуга веселья»: 19 500 ₽. Includes 40 min animation, a 1 h master class and 30 min of photography; shoppers and T-shirts are the client's own.
  - Стандарт «День чудес»: 23 000 ₽. Includes 1 h animation, a 1 h master class with shoppers or T-shirts provided, and 30 min of photography.
  - Премиум: 26 500 ₽. Includes 40 min animation plus face painting and soap bubbles, a master class from the VIP catalogue (candles and plaster souvenirs added) and 1 h of photography.
- Children's master-class catalogue: hand modelling at the table, painting pictures, painting on T-shirts and shoppers, and (VIP) candles and plaster souvenirs.
- Confirmed prices (client, 2026-10-11): date at the wheel 5 000 ₽, with photo shoot 6 500 ₽, art date 3 500 ₽; hand modelling 1 500 ₽ per person or 3 000 ₽ for two; individual wheel lesson 2 500 ₽; acrylic on canvas 1 500–5 000 ₽; children's corporate event 1 200–1 500 ₽ per child; birthday with clay modelling for 10 people 18 000–25 000 ₽. Gift certificates come in any amount. A fired piece is ready in 2 weeks or more.
- Children's classes and parties are for school-age children.
- By the client's choice, the site shows no plaster price and no session durations.

## Brand Commitments

- Name: «Сенсорика», tagline «творческая мастерская».
- **Logo must be kept.** It shows two hands forming a heart under a cup, with the wordmark «СЕНСОРИКА» in a narrow hand-drawn style and «творческая мастерская» below. A turquoise and a peach circle sit behind the cup. Only raster examples exist, in `цены/*.jpg`; a clean vector file is still needed.
- **Brand colours must be kept:** lavender/violet, peach/blush, turquoise accent and a warm cream background.
- The user wants the style to read as handmade, antiquity and Chuvash ornament rendered in an antique manner, in a warm, cosy home-workshop space. This direction should be layered on top of the brand palette.
- Existing voice: «Лепим любовь своими руками», «Романтика, творчество и тёплые воспоминания», «Всё включено — мы всё продумали за вас».

## Evidence on Hand

- `цены/`: posters for the three birthday packages, a "turnkey birthday" poster and a "date at the potter's wheel" poster with a photo of a couple at the wheel.
- Yandex Maps lists 99 photos and 23 reviews. They have not been retrieved, so do not invent review text.
- The user will add studio photos to `photos/`. Until then, use clearly marked photo slots and never pass off stock images as the studio's.
- Master photos will be added later.

## Product Principles

1. **Feel it first, then book.** Every section should lead from curiosity to a live visit.
2. **One studio, many reasons.** Children, couples and hobbyists each find their own entry point within one scroll.
3. **Honest and concrete.** Show real prices and real works. Unknown facts stay visible placeholders, never invented.
4. **Warm and handmade.** The site should feel like the room itself: touchable, imperfect, inviting.

## Accessibility & Inclusion

The game must be optional: skippable, with all key information available without it. It must respect reduced motion. Text must be readable on phones for parents and kids.
