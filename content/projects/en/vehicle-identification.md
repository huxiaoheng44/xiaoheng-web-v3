# Vehicle Noise Classification

## Summary

A machine-learning investigation using road-side measurements from 30 locations to distinguish passenger cars (PKW), trucks (LKW), and an “Else” class.

## Portfolio copy

> This project used acoustic, trajectory, and radar measurements to identify vehicle classes. We prepared an imbalanced physical-signal dataset through feature selection, normalisation, location filtering, and balanced sampling, then evaluated neural-network and K-nearest-neighbours approaches.

## Data work

- Key variables include `Lmax`, `T_6`, `thirdSpectrum`, localisation `trajectory`, radar pulses, and velocity.
- The pointwise slope of the trajectory was added as a feature because longer trucks show a slower change in localisation angle.
- `T_6` cropping helps remove non-target-car noise in level-time curves.
- `Lmax` was normalised by `lg(velocity)`; min-max and array scaling were applied to the data.
- Equal-ratio sampling addressed class imbalance, and special road/winter locations were considered separately.

## Findings

Both approaches separated PKW and LKW more reliably than the Else category. A presented test result reports class true-positive rates of 91.4% for PKW, 86.7% for LKW, and 35.5% for Else. The presentation identifies third-spectrum data as especially useful and recommends more representative data and feature analysis.

![Captured signal types](../assets/vehicle-identification/data-06.png)
![Test metrics](../assets/vehicle-identification/results-18.png)

- [Source PDF](../../pdf/VehicleIdentification.pdf)

